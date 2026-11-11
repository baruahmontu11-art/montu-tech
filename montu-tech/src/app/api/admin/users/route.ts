import { requireAdminUser } from '@/lib/admin';
import { jsonOk, jsonError } from '@/lib/api';
import { adminUserPatchSchema, parseJsonBody } from '@/lib/security/validation';
import { writeAuditLog } from '@/lib/security/audit';

/** GET /api/admin/users — list users (paginated, admin only). */
export async function GET(req: Request) {
  const auth = await requireAdminUser(req);
  if ('response' in auth) return auth.response;
  const url = new URL(req.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 50) || 50, 1), 100);
  const offset = Math.max(Number(url.searchParams.get('offset') ?? 0) || 0, 0);
  const { data, error, count } = await auth.admin
    .from('profiles')
    .select('id, email, full_name, is_admin, is_suspended, created_at, updated_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) return jsonError(error.message, 500);
  return jsonOk({ users: data ?? [], total: count ?? 0, limit, offset });
}

/** PATCH /api/admin/users — suspend/activate a user, or grant/revoke admin (admin only, cannot self-demote). */
export async function PATCH(req: Request) {
  const auth = await requireAdminUser(req);
  if ('response' in auth) return auth.response;
  const body = await parseJsonBody<unknown>(req);
  const { user_id, ...patch } = (body ?? {}) as Record<string, unknown>;
  if (typeof user_id !== 'string') return jsonError('user_id is required', 400);
  const parsed = adminUserPatchSchema.safeParse(patch);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? 'Invalid patch', 400);
  if (user_id === auth.user.id && parsed.data.is_admin === false) {
    return jsonError('You cannot remove your own admin access', 400);
  }
  const { data, error } = await auth.admin
    .from('profiles')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', user_id)
    .select('id, email, is_admin, is_suspended')
    .single();
  if (error || !data) return jsonError(error?.message ?? 'User not found', 404);
  await writeAuditLog({ user_id: auth.user.id, action: 'admin.user.update', resource_type: 'profile', resource_id: user_id, details: parsed.data as Record<string, unknown> });
  return jsonOk({ user: data });
}
