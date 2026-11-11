import { getGraphBaseUrl } from '@/lib/utils';

export interface MetaErrorInfo {
  code: number;
  subcode?: number;
  message: string;
  type?: string;
}

export class MetaApiError extends Error {
  code: number;
  subcode?: number;
  status: number;
  isPermissionError: boolean;
  isTokenExpired: boolean;
  isRateLimited: boolean;
  constructor(info: MetaErrorInfo, status = 400) {
    super(info.message);
    this.name = 'MetaApiError';
    this.code = info.code;
    this.subcode = info.subcode;
    this.status = status;
    // 190 = invalid/expired token; 200/10 = permission denied; 4/17 = rate limit
    this.isTokenExpired = info.code === 190;
    this.isPermissionError = info.code === 200 || info.code === 10 || info.code === 100;
    this.isRateLimited = info.code === 4 || info.code === 17 || status === 429;
  }
}

export interface FacebookPageInfo {
  id: string;
  name: string;
  access_token: string;
  category?: string;
  picture?: { data?: { url?: string } };
  tasks?: string[];
  perms?: string[];
}

export interface PageInsightRow {
  name: string;
  period: string;
  values: Array<{ value: number | Record<string, number>; end_time?: string }>;
  title?: string;
  description?: string;
}

export interface MetaComment {
  id: string;
  message?: string;
  created_time?: string;
  from?: { id?: string; name?: string };
  like_count?: number;
  comment_count?: number;
}

async function parseMetaResponse(res: Response): Promise<unknown> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || (data as Record<string, unknown>).error) {
    const err = (data as { error?: MetaErrorInfo }).error ?? {
      code: res.status,
      message: `Meta API request failed (${res.status})`,
    };
    throw new MetaApiError(err, res.status);
  }
  return data;
}

/** Centralized Meta Graph API client. Graph version comes from env, never hardcoded. */
export class MetaGraphClient {
  private base = getGraphBaseUrl();

  private async request<T>(
    path: string,
    token: string,
    init: RequestInit = {},
  ): Promise<T> {
    const url = path.startsWith('http') ? path : `${this.base}${path}`;
    const res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
    });
    return parseMetaResponse(res) as Promise<T>;
  }

  private async paginate<T>(path: string, token: string, limit = 100): Promise<T[]> {
    const out: T[] = [];
    let url = `${path}${path.includes('?') ? '&' : '?'}limit=${limit}`;
    // Safety cap: 10 pages to avoid unbounded loops.
    for (let i = 0; i < 10; i++) {
      const data = await this.request<{ data: T[]; paging?: { next?: string } }>(url, token);
      out.push(...(data.data ?? []));
      if (!data.paging?.next) break;
      url = data.paging.next;
    }
    return out;
  }

  /** Pages the user manages, with their Page access tokens. */
  async getPages(userAccessToken: string): Promise<FacebookPageInfo[]> {
    return this.paginate<FacebookPageInfo>(
      '/me/accounts?fields=id,name,access_token,category,picture,tasks',
      userAccessToken,
    );
  }

  /** Page insights for the given metrics. Returns rows Meta actually returns; missing metrics are absent, never fabricated. */
  async getPageInsights(
    pageId: string,
    pageAccessToken: string,
    metrics: string[],
    since?: string,
    until?: string,
    period: 'day' | 'week' | 'days_28' = 'day',
  ): Promise<PageInsightRow[]> {
    const params = new URLSearchParams({
      metric: metrics.join(','),
      period,
    });
    if (since) params.set('since', since);
    if (until) params.set('until', until);
    const data = await this.request<{ data: PageInsightRow[] }>(
      `/${pageId}/insights?${params.toString()}`,
      pageAccessToken,
    );
    return data.data ?? [];
  }

  /** Publish a text / link post to a Page. Returns the created post id. */
  async publishPost(
    pageId: string,
    pageAccessToken: string,
    opts: { message?: string; link?: string; published?: boolean; scheduled_publish_time?: number },
  ): Promise<{ id: string }> {
    const res = await fetch(`${this.base}/${pageId}/feed`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${pageAccessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(opts),
    });
    return parseMetaResponse(res) as Promise<{ id: string }>;
  }

  /** Publish a photo to a Page (URL or already-uploaded photo id handled by caller). */
  async publishPhoto(
    pageId: string,
    pageAccessToken: string,
    opts: { url?: string; caption?: string; published?: boolean },
  ): Promise<{ id: string; post_id?: string }> {
    const res = await fetch(`${this.base}/${pageId}/photos`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${pageAccessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(opts),
    });
    return parseMetaResponse(res) as Promise<{ id: string; post_id?: string }>;
  }

  /** Fetch a Page's recent posts (for the published-posts list). */
  async getPagePosts(pageId: string, pageAccessToken: string, limit = 25) {
    return this.paginate(
      `/${pageId}/posts?fields=id,message,created_time,permalink_url,full_picture,likes.summary(true),comments.summary(true)`,
      pageAccessToken,
      limit,
    );
  }

  /** Comments on a post (permitted fields only). */
  async getComments(postId: string, pageAccessToken: string, limit = 50): Promise<MetaComment[]> {
    return this.paginate<MetaComment>(
      `/${postId}/comments?fields=id,message,created_time,from,like_count,comment_count&order=reverse_chronological`,
      pageAccessToken,
      limit,
    );
  }

  /** Reply to a comment. */
  async replyToComment(commentId: string, pageAccessToken: string, message: string): Promise<{ id: string }> {
    const res = await fetch(`${this.base}/${commentId}/comments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${pageAccessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    return parseMetaResponse(res) as Promise<{ id: string }>;
  }

  /** Revoke all permissions / disconnect the app for a user token. */
  async revokePermissions(userAccessToken: string): Promise<boolean> {
    try {
      await this.request('/me/permissions', userAccessToken, { method: 'DELETE' });
      return true;
    } catch {
      return false; // token may already be invalid; disconnect proceeds locally regardless
    }
  }

  /** Fetch basic Page info (name, followers count where permitted). */
  async getPageInfo(pageId: string, pageAccessToken: string) {
    return this.request<{ id: string; name: string; followers_count?: number; fan_count?: number }>(
      `/${pageId}?fields=id,name,followers_count,fan_count,picture`,
      pageAccessToken,
    );
  }
}

export const metaGraph = new MetaGraphClient();
