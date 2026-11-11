import { requireAdminUser } from '@/lib/admin';
import { jsonOk, jsonError } from '@/lib/api';
import { writeAuditLog } from '@/lib/security/audit';

/** GET /api/admin/subscriptions — per-user subscription records (admin only). */
export async function GET(req: Request) {
  const auth = await requireAdminUser(req);
  if ('response' in auth) return auth.response;
  const admin = auth.admin;
  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 200);
  let q = admin
    .from('subscriptions')
    .select('id, user_id, plan_id, status, current_period_start, current_period_end, created_at, updated_at, plans(name, price_inr, billing_period), profiles(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) return jsonError(error.message, 500);
  return jsonOk({ subscriptions: data ?? [] });
}

/**
 * PATCH /api/admin/subscriptions — admin changes a subscription's status
 * (e.g. cancel, reactivate) or plan. Body: { subscription_id, status?, plan_id? }
 * Payments themselves are never faked here: activating a paid plan still
 * requires a verified Razorpay payment via /api/billing/verify.
 */
export async function PATCH(req: Request) {
  const auth = await requireAdminUser(req);
  if ('response' in auth) return auth.response;
  const admin = auth.admin;
  const body = await req.json().catch(() => null);
  if (!body?.subscription_id) return jsonError('subscription_id is required', 400);
  const allowed = ['active', 'trialing', 'past_due', 'cancelled', 'expired'];
  if (body.status && !allowed.includes(body.status)) return jsonError('Invalid status', 400);
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.status) patch.status = body.status;
  if (body.plan_id) patch.plan_id = body.plan_id;
  const { data, error } = await admin
    .from('subscriptions')
    .update(patch)
    .eq('id', body.subscription_id)
    .select('id, user_id, plan_id, status, current_period_end')
    .single();
  if (error) return jsonError(error.message, 500);
  await writeAuditLog({ user_id: auth.user.id, action: 'admin.subscription_update', resource_type: 'subscription', resource_id: data.id, details: patch });
  return jsonOk({ subscription: data });
}
