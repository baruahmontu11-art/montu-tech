import { requireUser, jsonOk, jsonError, checkUserRateLimit } from '@/lib/api';
import { createAdminClient } from '@/lib/supabase/admin';
import { ticketSchema, parseJsonBody } from '@/lib/security/validation';
import { writeAuditLog } from '@/lib/security/audit';

/** GET /api/support — the user's support tickets, newest first. */
export async function GET(req: Request) {
  const auth = await requireUser(req);
  if ('response' in auth) return auth.response;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('support_tickets')
    .select('id, subject, category, message, status, admin_response, page_id, created_at, updated_at')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) return jsonError(error.message, 500);
  return jsonOk({ tickets: data ?? [] });
}

/** POST /api/support — create a support ticket. */
export async function POST(req: Request) {
  const auth = await requireUser(req);
  if ('response' in auth) return auth.response;
  const limited = checkUserRateLimit(auth.user.id, 'support-create', 10, 60_000);
  if (limited) return limited;
  const body = await parseJsonBody<unknown>(req);
  const parsed = ticketSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? 'Invalid ticket', 400);

  const admin = createAdminClient();
  if (parsed.data.page_id) {
    const { data: page } = await admin.from('facebook_pages').select('id').eq('id', parsed.data.page_id).eq('user_id', auth.user.id).single();
    if (!page) return jsonError('Page not found', 404);
  }
  const { data, error } = await admin
    .from('support_tickets')
    .insert({
      user_id: auth.user.id,
      subject: parsed.data.subject,
      category: parsed.data.category,
      message: parsed.data.message,
      page_id: parsed.data.page_id ?? null,
      status: 'pending',
    })
    .select()
    .single();
  if (error) return jsonError(error.message, 500);
  await writeAuditLog({ user_id: auth.user.id, action: 'support.ticket.create', resource_type: 'support_ticket', resource_id: data.id });
  return jsonOk({ ticket: data }, 201);
}
