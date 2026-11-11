import { requireUser, jsonOk, jsonError, checkUserRateLimit } from '@/lib/api';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkoutSchema, parseJsonBody } from '@/lib/security/validation';
import { createRazorpayOrder, getRazorpayKeyId } from '@/lib/payments/razorpay';
import { PLANS } from '@/lib/plans';

/** POST /api/billing/checkout — create a Razorpay order for a paid plan. No payment is marked successful here. */
export async function POST(req: Request) {
  const auth = await requireUser(req);
  if ('response' in auth) return auth.response;
  const limited = checkUserRateLimit(auth.user.id, 'billing-checkout', 10, 60_000);
  if (limited) return limited;
  const body = await parseJsonBody<unknown>(req);
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid plan', 400);
  const plan = PLANS[parsed.data.plan_id];
  if (plan.priceInr <= 0) return jsonError('The Free plan needs no payment', 400);

  const admin = createAdminClient();
  const receipt = `mt_${auth.user.id.slice(0, 8)}_${Date.now()}`;
  try {
    const order = await createRazorpayOrder({
      amountPaise: plan.priceInr * 100,
      currency: 'INR',
      receipt,
      notes: { user_id: auth.user.id, plan_id: plan.id },
    });
    await admin.from('payments').insert({
      user_id: auth.user.id,
      plan_id: plan.id,
      razorpay_order_id: order.id,
      amount: plan.priceInr,
      currency: 'INR',
      status: 'created',
    });
    return jsonOk({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: getRazorpayKeyId(),
      plan_id: plan.id,
    });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : 'Failed to create payment order', 500);
  }
}
