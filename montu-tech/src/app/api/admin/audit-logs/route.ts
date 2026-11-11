import { requireAdminUser } from '@/lib/admin';
import { jsonOk, jsonError } from '@/lib/api';

/** GET /api/admin/audit-logs — recent audit entries (admin only). */
export async function GET(req: Request) {
  const auth = await requireAdminUser(req);
  if ('response' in auth) return auth.response;
  const url = new URL(req.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 100) || 100, 1), 200);
  const { data, error } = await auth.admin
    .from('audit_logs')
    .select('id, user_id, action, resource_type, resource_id, details, ip_address, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return jsonError(error.message, 500);
  return jsonOk({ logs: data ?? [] });
}
