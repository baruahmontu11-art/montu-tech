import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyWebhookSignature } from '@/lib/payments/razorpay';

/**
 * POST /api/webhooks/razorpay — Razorpay webhook.
 * Verifies X-Razorpay-Signature over the RAW body before trusting anything,
 * then updates payments/subscriptions. Idempotent via razorpay_payment_id.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-razorpay-signature');
  let ok = false;
  try {
    ok = verifyWebhookSignature(rawBody, signature);
  } catch (err) {
    console.error('[webhook/razorpay] signature config error', err);
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }
  if (!ok) return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });

  let event: { event?: string; payload?: { payment?: { entity?: Record<string, unknown> }; order?: { entity?: Record<string, unknown> } } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const admin = createAdminClient();
  const entity = event.payload?.payment?.entity ?? {};
  const paymentId = entity.id as string | undefined;
  const orderId = entity.order_id as string | undefined;
  const status = entity.status as string | undefined;

  if (event.event === 'payment.captured' && paymentId && orderId) {
    const { data: payment } = await admin
      .from('payments')
      .select('id, user_id, plan_id, status')
      .eq('razorpay_order_id', orderId)
      .single();
    if (payment && payment.status !== 'paid') {
      await admin.from('payments').update({ status: 'paid', razorpay_payment_id: paymentId }).eq('id', payment.id);
      // Activate subscription if the verify endpoint hasn't already (idempotent).
      const { data: existing } = await admin.from('subscriptions').select('id').eq('user_id', payment.user_id).eq('status', 'active').limit(1);
      if (!existing?.length) {
        const now = new Date();
        const ends = new Date(now);
        ends.setMonth(ends.getMonth() + 1);
        await admin.from('subscriptions').insert({
          user_id: payment.user_id,
          plan_id: payment.plan_id,
          status: 'active',
          current_period_start: now.toISOString(),
          current_period_end: ends.toISOString(),
          razorpay_payment_id: paymentId,
        });
      }
    }
  } else if (event.event === 'payment.failed' && orderId) {
    await admin.from('payments').update({ status: 'failed' }).eq('razorpay_order_id', orderId);
  }

  return NextResponse.json({ received: true });
}
