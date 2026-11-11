import { requireUser, jsonOk, jsonError, checkUserRateLimit } from '@/lib/api';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/security/audit';
import { parseJsonBody } from '@/lib/security/validation';
import { z } from 'zod';

/** GET /api/meta/pages — list the user's connected Pages (tokens never returned). */
export async function GET(req: Request) {
  const auth = await requireUser(req);
  if ('response' in auth) return auth.response;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('facebook_pages')
    .select('id, page_id, page_name, category, picture_url, status, created_at, updated_at')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: true });
  if (error) return jsonError(error.message, 500);
  const { data: conn } = await admin
    .from('meta_connections')
    .select('status, token_expires_at')
    .eq('user_id', auth.user.id)
    .single();
  return jsonOk({ pages: data ?? [], connection: conn ?? null });
}

const deleteSchema = z.object({ page_id: z.string().uuid() });

/** DELETE /api/meta/pages — disconnect a single Page. */
export async function DELETE(req: Request) {
  const auth = await requireUser(req);
  if ('response' in auth) return auth.response;
  const limited = checkUserRateLimit(auth.user.id, 'meta-pages-delete', 10, 60_000);
  if (limited) return limited;
  const body = await parseJsonBody<unknown>(req);
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? 'Invalid request', 400);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('facebook_pages')
    .delete()
    .eq('id', parsed.data.page_id)
    .eq('user_id', auth.user.id)
    .select('id')
    .single();
  if (error || !data) return jsonError('Page not found', 404);
  await writeAuditLog({ user_id: auth.user.id, action: 'meta.page.disconnect', resource_type: 'facebook_page', resource_id: data.id });
  return jsonOk({ success: true });
}
