import { requireAdminUser } from '@/lib/admin';
import { jsonOk, jsonError } from '@/lib/api';
import { payoutStatusSchema, parseJsonBody } from '@/lib/security/validation';
import { z } from 'zod';
import { writeAuditLog } from '@/lib/security/audit';

const patchSchema = z.object({
  status: payoutStatusSchema,
  admin_response: z.string().trim().max(5000).optional().nullable(),
});

/** GET /api/admin/payout-requests — all payout assistance requests (admin only). */
export async function GET(req: Request) {
  const auth = await requireAdminUser(req);
  if ('response' in auth) return auth.response;
  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  let q = auth.admin
    .from('payout_requests')
    .select('id, user_id, type, page_id, current_value, requested_value, reason, document_url, status, admin_response, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(100);
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) return jsonError(error.message, 500);
  return jsonOk({ requests: data ?? [] });
}

/** PATCH /api/admin/payout-requests — update status (pending/under_review/in_progress/waiting_for_information/completed/rejected). */
export async function PATCH(req: Request) {
  const auth = await requireAdminUser(req);
  if ('response' in auth) return auth.response;
  const body = await parseJsonBody<unknown>(req);
  const { request_id, ...patch } = (body ?? {}) as Record<string, unknown>;
  if (typeof request_id !== 'string') return jsonError('request_id is required', 400);
  const parsed = patchSchema.safeParse(patch);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? 'Invalid patch', 400);
  const { data, error } = await auth.admin
    .from('payout_requests')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', request_id)
    .select()
    .single();
  if (error || !data) return jsonError(error?.message ?? 'Payout request not found', 404);
  await writeAuditLog({ user_id: auth.user.id, action: 'admin.payout.update', resource_type: 'payout_request', resource_id: request_id, details: { status: parsed.data.status } });
  return jsonOk({ request: data });
}
