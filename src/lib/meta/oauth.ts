import { randomBytes, createHash } from 'crypto';
import { getGraphApiVersion, getBaseUrl } from '@/lib/utils';
import { SCOPES } from './permissions';

export function getMetaAppId(): string {
  const id = process.env.META_APP_ID;
  if (!id) throw new Error('Missing META_APP_ID');
  return id;
}
export function getMetaAppSecret(): string {
  const s = process.env.META_APP_SECRET;
  if (!s) throw new Error('Missing META_APP_SECRET');
  return s;
}
export function getOAuthRedirectUri(): string {
  return `${getBaseUrl()}/api/meta/callback`;
}

/** Build the Facebook OAuth authorization URL (authorization-code flow). */
export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: getMetaAppId(),
    redirect_uri: getOAuthRedirectUri(),
    state,
    scope: SCOPES,
    response_type: 'code',
  });
  return `https://www.facebook.com/${getGraphApiVersion()}/dialog/oauth?${params.toString()}`;
}

/** Random state value stored in an httpOnly cookie and compared on callback. */
export function generateState(): string {
  return randomBytes(32).toString('hex');
}

/** SHA-256 hash of the state, for safe comparison / logging without storing raw state. */
export function hashState(state: string): string {
  return createHash('sha256').update(state).digest('hex');
}

export interface TokenExchangeResult {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

/** Exchange an authorization code for a short-lived user access token (server-side). */
export async function exchangeCodeForToken(code: string): Promise<TokenExchangeResult> {
  const params = new URLSearchParams({
    client_id: getMetaAppId(),
    client_secret: getMetaAppSecret(),
    redirect_uri: getOAuthRedirectUri(),
    code,
  });
  const res = await fetch(
    `https://graph.facebook.com/${getGraphApiVersion()}/oauth/access_token?${params.toString()}`,
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    throw new Error(data?.error?.message || `Meta token exchange failed (${res.status})`);
  }
  return data as TokenExchangeResult;
}

/** Exchange a short-lived token for a long-lived (~60 day) user token. */
export async function exchangeForLongLivedToken(shortLived: string): Promise<TokenExchangeResult> {
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: getMetaAppId(),
    client_secret: getMetaAppSecret(),
    fb_exchange_token: shortLived,
  });
  const res = await fetch(
    `https://graph.facebook.com/${getGraphApiVersion()}/oauth/access_token?${params.toString()}`,
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    throw new Error(data?.error?.message || `Meta long-lived token exchange failed (${res.status})`);
  }
  return data as TokenExchangeResult;
}

/** Debug a token (validity, scopes, expiry) via /debug_token. */
export async function debugToken(inputToken: string) {
  const params = new URLSearchParams({
    input_token: inputToken,
    access_token: `${getMetaAppId()}|${getMetaAppSecret()}`,
  });
  const res = await fetch(
    `https://graph.facebook.com/${getGraphApiVersion()}/debug_token?${params.toString()}`,
  );
  const data = await res.json().catch(() => ({}));
  return data?.data ?? null;
}
