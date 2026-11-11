import { NextResponse } from 'next/server';
import { requireUser, checkRateLimit } from '@/lib/api';
import { buildAuthUrl, generateState } from '@/lib/meta/oauth';
import { OAUTH_STATE_COOKIE, OAUTH_STATE_MAX_AGE } from '@/lib/security/csrf';

/** GET /api/meta/connect — start Facebook OAuth (authorization-code flow). */
export async function GET(req: Request) {
  const limited = checkRateLimit(req, 'meta-connect', 10, 60_000);
  if (limited) return limited;
  const auth = await requireUser(req);
  if ('response' in auth) return auth.response;

  const state = generateState();
  const url = buildAuthUrl(state);
  const res = NextResponse.redirect(url);
  res.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: OAUTH_STATE_MAX_AGE,
  });
  return res;
}
