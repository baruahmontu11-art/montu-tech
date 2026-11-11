import { requireAdminUser } from '@/lib/admin';
import { jsonOk, jsonError } from '@/lib/api';
import { writeAuditLog } from '@/lib/security/audit';
import { getGraphApiVersion } from '@/lib/utils';

function configStatus() {
  // Booleans only — never return secret values to the frontend.
  return {
    meta_app_configured: Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET),
    meta_graph_api_version: getGraphApiVersion(),
    meta_webhook_configured: Boolean(process.env.META_WEBHOOK_VERIFY_TOKEN),
    razorpay_configured: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
    supabase_configured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    token_encryption_configured: Boolean(process.env.TOKEN_ENCRYPTION_KEY),
  };
}

/** GET /api/admin/settings — site settings, announcements, API config status (admin only). */
export async function GET(req: Request) {
  const auth = await requireAdminUser(req);
  if ('response' in auth) return auth.response;
  const admin = auth.admin;
  const [settings, announcements] = await Promise.all([
    admin.from('site_settings').select('key, value, updated_at').order('key'),
    admin.from('announcements').select('id, title, body, is_active, created_at').order('created_at', { ascending: false }).limit(20),
  ]);
  if (settings.error) return jsonError(settings.error.message, 500);
  return jsonOk({
    settings: Object.fromEntries((settings.data ?? []).map((s) => [s.key, s.value])),
    announcements: announcements.data ?? [],
    config: configStatus(),
  });
}

/**
 * POST /api/admin/settings — upsert site settings and/or create an announcement.
 * Body: { settings?: Record<string,string>, announcement?: { title, body, is_active? } }
 */
export async function POST(req: Request) {
  const auth = await requireAdminUser(req);
  if ('response' in auth) return auth.response;
  const admin = auth.admin;
  const body = await req.json().catch(() => null);
  if (!body || (typeof body !== 'object')) return jsonError('Invalid body', 400);

  if (body.settings && typeof body.settings === 'object') {
    const rows = Object.entries(body.settings).map(([key, value]) => ({
      key: String(key).slice(0, 100),
      value: String(value).slice(0, 5000),
      updated_at: new Date().toISOString(),
    }));
    const { error } = await admin.from('site_settings').upsert(rows, { onConflict: 'key' });
    if (error) return jsonError(error.message, 500);
  }
  let announcement = null;
  if (body.announcement?.title) {
    const { data, error } = await admin
      .from('announcements')
      .insert({ title: String(body.announcement.title).slice(0, 200), body: String(body.announcement.body ?? '').slice(0, 5000), is_active: body.announcement.is_active !== false, created_by: auth.user.id })
      .select('id, title, body, is_active, created_at')
      .single();
    if (error) return jsonError(error.message, 500);
    announcement = data;
  }
  await writeAuditLog({ user_id: auth.user.id, action: 'admin.settings_update', resource_type: 'site_settings', details: { settings: Object.keys(body.settings ?? {}), announcement: announcement?.id ?? null } });
  return jsonOk({ saved: true, announcement });
}
