import { requireAdminUser } from '@/lib/admin';
import { jsonOk, jsonError } from '@/lib/api';
import { adminTicketPatchSchema, parseJsonBody } from '@/lib/security/validation';
import { writeAuditLog } from '@/lib/security/audit';

/** GET /api/admin/tickets — all support tickets, filterable by status (admin only). */
export async function GET(req: Request) {
  const auth = await requireAdminUser(req);
  if ('response' in auth) return auth.response;
  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  let q = auth.admin
    .from('support_tickets')
    .select('id, user_id, subject, category, message, status, admin_response, page_id, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(100);
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) return jsonError(error.message, 500);
  return jsonOk({ tickets: data ?? [] });
}

/** PATCH /api/admin/tickets — update ticket status + admin response (admin only). */
export async function PATCH(req: Request) {
  const auth = await requireAdminUser(req);
  if ('response' in auth) return auth.response;
  const body = await parseJsonBody<unknown>(req);
  const { ticket_id, ...patch } = (body ?? {}) as Record<string, unknown>;
  if (typeof ticket_id !== 'string') return jsonError('ticket_id is required', 400);
  const parsed = adminTicketPatchSchema.safeParse(patch);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? 'Invalid patch', 400);
  const { data, error } = await auth.admin
    .from('support_tickets')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', ticket_id)
    .select()
    .single();
  if (error || !data) return jsonError(error?.message ?? 'Ticket not found', 404);
  await writeAuditLog({ user_id: auth.user.id, action: 'admin.ticket.update', resource_type: 'support_ticket', resource_id: ticket_id, details: parsed.data as Record<string, unknown> });
  return jsonOk({ ticket: data });
}
