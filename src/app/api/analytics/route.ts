import { requireUser, jsonOk, jsonError } from '@/lib/api';
import { createAdminClient } from '@/lib/supabase/admin';
import { decryptToken } from '@/lib/security/encryption';
import { metaGraph, MetaApiError } from '@/lib/meta/graph';
import { parseDateParam } from '@/lib/utils';

/**
 * GET /api/analytics?page_id=<uuid>&since=YYYY-MM-DD&until=YYYY-MM-DD
 * Returns only metrics the Graph API actually returns for the Page.
 * Metrics Meta does not return are listed under `unavailable` — never fabricated.
 */
const REQUESTED_METRICS = [
  'page_impressions',
  'page_engaged_users',
  'page_post_engagements',
  'page_fans',
  'page_views_total',
  'page_actions_post_reactions_total',
];

export async function GET(req: Request) {
  const auth = await requireUser(req);
  if ('response' in auth) return auth.response;
  const url = new URL(req.url);
  const pageUuid = url.searchParams.get('page_id');
  if (!pageUuid) return jsonError('page_id is required', 400);
  const since = parseDateParam(url.searchParams.get('since'));
  const until = parseDateParam(url.searchParams.get('until'));

  const admin = createAdminClient();
  const { data: page } = await admin
    .from('facebook_pages')
    .select('id, page_id, page_name, access_token_encrypted, status')
    .eq('id', pageUuid)
    .eq('user_id', auth.user.id)
    .single();
  if (!page) return jsonError('Page not found', 404);
  if (page.status !== 'connected') {
    return jsonOk({ page: { id: page.id, name: page.page_name }, available: false, unavailable_reason: `Page status is ${page.status}. Reconnect Facebook to refresh insights.`, metrics: [], unavailable: REQUESTED_METRICS });
  }

  let token: string;
  try {
    token = decryptToken(page.access_token_encrypted);
  } catch {
    return jsonError('Stored Page token could not be decrypted. Please reconnect Facebook.', 401);
  }

  try {
    const rows = await metaGraph.getPageInsights(
      page.page_id,
      token,
      REQUESTED_METRICS,
      since ? since.toISOString().slice(0, 10) : undefined,
      until ? until.toISOString().slice(0, 10) : undefined,
    );
    const returned = new Set(rows.map((r) => r.name));
    const unavailable = REQUESTED_METRICS.filter((m) => !returned.has(m));
    // Cache the fetched snapshot for the overview endpoint (best effort).
    await admin.from('page_insights').insert({
      user_id: auth.user.id,
      page_id: page.id,
      metrics: rows,
      fetched_at: new Date().toISOString(),
    });
    return jsonOk({
      page: { id: page.id, name: page.page_name },
      available: true,
      metrics: rows,
      unavailable,
      note: unavailable.length
        ? 'Some metrics were not returned by the Meta Graph API for this Page/period (e.g. permission not granted or no data). They are listed as unavailable, not estimated.'
        : undefined,
    });
  } catch (err) {
    if (err instanceof MetaApiError) {
      if (err.isTokenExpired) {
        await admin.from('facebook_pages').update({ status: 'token_expired' }).eq('id', page.id);
        return jsonError('Page access token expired. Please reconnect Facebook.', 401, { token_expired: true });
      }
      if (err.isPermissionError) {
        return jsonError('Missing Facebook permission (pages_read_engagement). Please reconnect and grant it.', 403, { permission_error: true });
      }
      return jsonError(err.message, 400);
    }
    return jsonError('Failed to load analytics', 500);
  }
}
