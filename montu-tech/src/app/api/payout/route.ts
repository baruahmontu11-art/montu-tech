import { requireUser, jsonOk, jsonError, checkUserRateLimit } from '@/lib/api';
import { createAdminClient } from '@/lib/supabase/admin';
import { payoutRequestSchema, parseJsonBody } from '@/lib/security/validation';
import { writeAuditLog } from '@/lib/security/audit';

/**
 * Payout Assistance — SUPPORT-REQUEST workflow only.
 * Meta offers NO public API to modify bank details, payout ownership, DOB,
 * tax details or transfer payout sources. These requests are tracked here
 * for an admin to guide the user through Meta's own UI / support channels,
 * with optional supporting documents in the 'support-documents' bucket.
 * Nothing in this module claims to change a Meta payout directly.
 */
const PAYOUT_DISCLAIMER =
  'Payout changes cannot be made directly through any Meta API. This is a support request: our team will guide you through the official Meta process.';

/** GET /api/payout — the user's payout assistance requests. */
export async function GET(req: Request) {
  const auth = await requireUser(req);
  if ('response' in auth) return auth.response;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('payout_requests')
    .select('id, type, page_id, current_value, requested_value, reason, document_url, status, admin_response, created_at, updated_at')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) return jsonError(error.message, 500);
  return jsonOk({ requests: data ?? [], disclaimer: PAYOUT_DISCLAIMER });
}

/** POST /api/payout — file a payout assistance request. */
export async function POST(req: Request) {
  const auth = await requireUser(req);
  if ('response' in auth) return auth.response;
  const limited = checkUserRateLimit(auth.user.id, 'payout-create', 10, 60_000);
  if (limited) return limited;
  const body = await parseJsonBody<unknown>(req);
  const parsed = payoutRequestSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? 'Invalid payout request', 400);

  const admin = createAdminClient();
  if (parsed.data.page_id) {
    const { data: page } = await admin.from('facebook_pages').select('id').eq('id', parsed.data.page_id).eq('user_id', auth.user.id).single();
    if (!page) return jsonError('Page not found', 404);
  }
  // If a document_url was supplied, verify it points at our support-documents bucket path for this user.
  if (parsed.data.document_url && !parsed.data.document_url.includes('support-documents')) {
    return jsonError('document_url must be a file uploaded to the support-documents bucket', 400);
  }
  const { data, error } = await admin
    .from('payout_requests')
    .insert({
      user_id: auth.user.id,
      type: parsed.data.type,
      page_id: parsed.data.page_id ?? null,
      current_value: parsed.data.current_value ?? null,
      requested_value: parsed.data.requested_value,
      reason: parsed.data.reason,
      document_url: parsed.data.document_url ?? null,
      status: 'pending',
    })
    .select()
    .single();
  if (error) return jsonError(error.message, 500);

  // Record the document link, if any, in support_documents (best effort).
  if (parsed.data.document_url) {
    await admin.from('support_documents').insert({
      user_id: auth.user.id,
      payout_request_id: data.id,
      file_url: parsed.data.document_url,
      file_name: parsed.data.document_url.split('/').pop() ?? 'document',
    });
  }
  await writeAuditLog({ user_id: auth.user.id, action: 'payout.request.create', resource_type: 'payout_request', resource_id: data.id, details: { type: parsed.data.type } });
  return jsonOk({ request: data, disclaimer: PAYOUT_DISCLAIMER }, 201);
}
