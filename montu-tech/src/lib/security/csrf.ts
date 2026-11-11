import { randomBytes, timingSafeEqual } from 'crypto';

/**
 * CSRF / OAuth-state token helpers.
 * OAuth state is stored in an httpOnly, Secure, SameSite=Lax cookie and
 * compared (timing-safe) with the `state` query param on the callback.
 * The same generate/verify pair can protect state-changing forms.
 */
export function generateCsrfToken(): string {
  return randomBytes(32).toString('hex');
}

export function verifyCsrfToken(expected: string | null | undefined, actual: string | null | undefined): boolean {
  if (!expected || !actual) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(actual);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export const OAUTH_STATE_COOKIE = 'mt_oauth_state';
export const OAUTH_STATE_MAX_AGE = 600; // 10 minutes
