/**
 * In-memory sliding-window rate limiter (per key = IP or user id).
 * Sufficient for a single-instance Railway deployment; for multi-instance
 * deployments replace with a Redis-backed limiter behind the same interface.
 */
interface Entry {
  timestamps: number[];
}
const store = new Map<string, Entry>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInMs: number;
}

export function rateLimit(
  key: string,
  limit = 60,
  windowMs = 60_000,
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key) ?? { timestamps: [] };
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);
  if (entry.timestamps.length >= limit) {
    const oldest = entry.timestamps[0];
    return { allowed: false, remaining: 0, resetInMs: windowMs - (now - oldest) };
  }
  entry.timestamps.push(now);
  store.set(key, entry);
  return { allowed: true, remaining: limit - entry.timestamps.length, resetInMs: windowMs };
}

/** Extract a best-effort client IP from a Next.js request. */
export function getClientIp(req: Request): string {
  const h = (name: string) => req.headers.get(name);
  const forwarded = h('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return h('x-real-ip') || 'unknown';
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Remaining': String(result.remaining),
    'Retry-After': String(Math.ceil(result.resetInMs / 1000)),
  };
}
