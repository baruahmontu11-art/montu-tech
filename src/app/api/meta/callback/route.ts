import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { exchangeCodeForToken, exchangeForLongLivedToken } from '@/lib/meta/oauth';
import { metaGraph, MetaApiError } from '@/lib/meta/graph';
import { encryptToken } from '@/lib/security/encryption';
import { verifyCsrfToken, OAUTH_STATE_COOKIE } from '@/lib/security/csrf';
import { writeAuditLog } from '@/lib/security/audit';
import { getBaseUrl } from '@/lib/utils';

/**
 * GET /api/meta/callback — Facebook OAuth callback.
 * Validates state, exchanges the code server-side, upgrades to a long-lived
 * token, fetches the user's Pages, encrypts + upserts them, then redirects
 * to /dashboard/pages. No Facebook password is ever handled.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const base = getBaseUrl();
  const fail = (msg: string) =>
    NextResponse.redirect(`${base}/dashboard/pages?meta_error=${encodeURIComponent(msg)}`);

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  if (error) return fail(url.searchParams.get('error_description') || 'Facebook authorization was denied.');
  if (!code || !state) return fail('Missing authorization code or state.');

  const cookieStore = await cookies();
  const cookieState = cookieStore.get(OAUTH_STATE_COOKIE)?.value;
  if (!verifyCsrfToken(cookieState, state)) {
    return fail('Invalid OAuth state. Please try connecting again.');
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${base}/login?next=/dashboard/pages`);

  try {
    const short = await exchangeCodeForToken(code);
    let longLived = short;
    try {
      longLived = await exchangeForLongLivedToken(short.access_token);
    } catch {
      // Short-lived token is still usable; long-lived exchange is best-effort.
    }
    const expiresAt = longLived.expires_in
      ? new Date(Date.now() + longLived.expires_in * 1000).toISOString()
      : null;

    const pages = await metaGraph.getPages(longLived.access_token);
    const admin = createAdminClient();

    const { data: connection, error: connErr } = await admin
      .from('meta_connections')
      .upsert(
        {
          user_id: user.id,
          access_token_encrypted: encryptToken(longLived.access_token),
          token_expires_at: expiresAt,
          status: 'active',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      )
      .select('id')
      .single();
    if (connErr || !connection) throw new Error(connErr?.message || 'Failed to save Meta connection');

    for (const page of pages) {
      await admin.from('facebook_pages').upsert(
        {
          user_id: user.id,
          meta_connection_id: connection.id,
          page_id: page.id,
          page_name: page.name,
          category: page.category ?? null,
          picture_url: page.picture?.data?.url ?? null,
          access_token_encrypted: encryptToken(page.access_token),
          status: 'connected',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,page_id' },
      );
    }

    await writeAuditLog({
      user_id: user.id,
      action: 'meta.connect',
      resource_type: 'meta_connection',
      resource_id: connection.id,
      details: { pages_connected: pages.length },
    });

    const res = NextResponse.redirect(`${base}/dashboard/pages?connected=${pages.length}`);
    res.cookies.set(OAUTH_STATE_COOKIE, '', { path: '/', maxAge: 0 });
    return res;
  } catch (err) {
    const msg = err instanceof MetaApiError
      ? err.isPermissionError
        ? 'Facebook permission was denied or revoked. Please reconnect and grant the requested permissions.'
        : err.message
      : err instanceof Error ? err.message : 'Facebook connection failed.';
    console.error('[meta/callback]', err);
    return fail(msg);
  }
}
