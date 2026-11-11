import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Meta webhooks.
 * GET  — verification: hub.mode=subscribe + hub.verify_token must match META_WEBHOOK_VERIFY_TOKEN, then echo hub.challenge.
 * POST — verify X-Hub-Signature-256 (HMAC-SHA256 over raw body with META_APP_SECRET), then store the event in webhook_events.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  const expected = process.env.META_WEBHOOK_VERIFY_TOKEN;
  if (mode === 'subscribe' && token && expected && token === expected && challenge) {
    return new NextResponse(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }
  return NextResponse.json({ error: 'Webhook verification failed' }, { status: 403 });
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-hub-signature-256');
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  if (!signature?.startsWith('sha256=')) return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
  const expected = `sha256=${createHmac('sha256', appSecret).update(rawBody).digest('hex')}`;
  let valid = false;
  try {
    valid = timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    valid = false;
  }
  if (!valid) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const obj = payload as { object?: string; entry?: unknown[] };
  try {
    const admin = createAdminClient();
    await admin.from('webhook_events').insert({
      source: 'meta',
      event_type: obj.object ?? 'unknown',
      payload: payload as Record<string, unknown>,
      processed: false,
    });
  } catch (err) {
    console.error('[webhook/meta] failed to store event', err);
  }
  // Acknowledge immediately; heavy processing (if any) happens async elsewhere.
  return NextResponse.json({ received: true });
}
