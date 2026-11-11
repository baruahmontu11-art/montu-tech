import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Razorpay integration via the official REST API (no SDK dependency needed).
 * Payments are NEVER marked successful on frontend confirmation alone:
 * checkout creates an order, verifyPaymentSignature checks the HMAC, and
 * the webhook handler re-verifies the webhook signature before updating
 * payments/subscriptions.
 */
function getKeys(): { keyId: string; keySecret: string } {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error('Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET');
  return { keyId, keySecret };
}

function authHeader(): string {
  const { keyId, keySecret } = getKeys();
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  status: string;
  receipt?: string;
}

export async function createRazorpayOrder(opts: {
  amountPaise: number;
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrder> {
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: opts.amountPaise,
      currency: opts.currency ?? 'INR',
      receipt: opts.receipt,
      notes: opts.notes ?? {},
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: { description?: string } })?.error?.description || `Razorpay order failed (${res.status})`);
  return data as RazorpayOrder;
}

export function getRazorpayKeyId(): string {
  return getKeys().keyId;
}

/** Verify razorpay_signature = HMAC-SHA256(order_id|payment_id, key_secret). */
export function verifyPaymentSignature(opts: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const { keySecret } = getKeys();
  const expected = createHmac('sha256', keySecret)
    .update(`${opts.orderId}|${opts.paymentId}`)
    .digest('hex');
  return timingSafeEqualHex(expected, opts.signature);
}

function timingSafeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, 'hex');
    const bb = Buffer.from(b, 'hex');
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

/** Verify the X-Razorpay-Signature header over the raw webhook body. */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) throw new Error('Missing RAZORPAY_WEBHOOK_SECRET');
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  return timingSafeEqualHex(expected, signature);
}

export async function fetchPayment(paymentId: string) {
  const res = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
    headers: { Authorization: authHeader() },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Razorpay payment fetch failed (${res.status})`);
  return data as { id: string; status: string; amount: number; currency: string; order_id?: string; method?: string };
}
