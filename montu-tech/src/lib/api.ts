import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit, getClientIp, rateLimitHeaders } from '@/lib/security/rate-limit';
import type { User } from '@supabase/supabase-js';

export function jsonError(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}
export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

/** Authenticate the request via Supabase session cookies. Returns null + response when unauthenticated. */
export async function requireUser(req: Request): Promise<{ user: User } | { response: NextResponse }> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { response: jsonError('Unauthorized', 401) };
  return { user: data.user };
}

/** Apply a sliding-window rate limit; returns a 429 response when exceeded, else null. */
export function checkRateLimit(req: Request, keyPrefix: string, limit = 60, windowMs = 60_000): NextResponse | null {
  const ip = getClientIp(req);
  const result = rateLimit(`${keyPrefix}:${ip}`, limit, windowMs);
  if (!result.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again shortly.' },
      { status: 429, headers: rateLimitHeaders(result) },
    );
  }
  return null;
}

/** Per-user rate limit (stricter for write endpoints). */
export function checkUserRateLimit(userId: string, keyPrefix: string, limit = 30, windowMs = 60_000): NextResponse | null {
  const result = rateLimit(`${keyPrefix}:user:${userId}`, limit, windowMs);
  if (!result.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again shortly.' },
      { status: 429, headers: rateLimitHeaders(result) },
    );
  }
  return null;
}
