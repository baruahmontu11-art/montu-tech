import { requireUser, jsonOk, jsonError, checkUserRateLimit } from '@/lib/api';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyPaymentSchema, parseJsonBody } from '@/lib/security/validation';
import { verifyPaymentSignature, fetchPayment } from '@/lib/payments/razorpay';
import { PLANS } from '@/lib/plans';
import { writeAuditLog } from '@/lib/security/audit';

/**
 * POST /api/billing/verify — activate a subscription ONLY after server-side
 * verification: (1) HMAC signature check, (2) payment fetched from Razorpay
 * and confirmed captured/authorized with matching order + amount.
 * Frontend confirmation alone never activates anything.
 */
export async function POST(req: Request) {
  const auth = await requireUser(req);
  if ('response' in auth) return auth.response;
  const limited = checkUserRateLimit(auth.user.id, 'billing-verify', 10, 60_000);
  if (limited) return limited;
  const body = await parseJsonBody<unknown>(req);
  const parsed = verifyPaymentSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? 'Invalid verification payload', 400);
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan_id } = parsed.data;
  const plan = PLANS[plan_id];

  const signatureOk = verifyPaymentSignature({
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature,
  });
  if (!signatureOk) return jsonError('Payment signature verification failed', 400);

  const admin = createAdminClient();
  const { data: payment } = await admin
    .from('payments')
    .select('id, amount, status')
    .eq('razorpay_order_id', razorpay_order_id)
    .eq('user_id', auth.user.id)
    .single();
  if (!payment) return jsonError('Order not found', 404);
  if (payment.status === 'paid') return jsonError('Payment already verified', 409);

  let remote;
  try {
    remote = await fetchPayment(razorpay_payment_id);
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : 'Could not confirm payment with Razorpay', 502);
  }
  if (remote.order_id && remote.order_id !== razorpay_order_id) return jsonError('Payment order mismatch', 400);
  if (remote.amount !== plan.priceInr * 100) return jsonError('Payment amount mismatch', 400);
  if (remote.status !== 'captured' && remote.status !== 'authorized') {
    return jsonError(`Payment is not captured (status: ${remote.status})`, 400);
  }

  const now = new Date();
  const ends = new Date(now);
  ends.setMonth(ends.getMonth() + 1);
  await admin.from('payments').update({ status: 'paid', razorpay_payment_id, updated_at: now.toISOString() }).eq('id', payment.id);
  // Close any previous active subscription, then activate the new one.
  await admin.from('subscriptions').update({ status: 'cancelled', updated_at: now.toISOString() }).eq('user_id', auth.user.id).eq('status', 'active');
  const { data: sub, error } = await admin.from('subscriptions').insert({
    user_id: auth.user.id,
    plan_id,
    status: 'active',
    current_period_start: now.toISOString(),
    current_period_end: ends.toISOString(),
    razorpay_payment_id,
  }).select().single();
  if (error) return jsonError(error.message, 500);
  await writeAuditLog({ user_id: auth.user.id, action: 'billing.subscription.activated', resource_type: 'subscription', resource_id: sub.id, details: { plan_id, payment_id: razorpay_payment_id } });
  return jsonOk({ success: true, subscription: sub });
}
