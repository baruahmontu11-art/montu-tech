import { requireUser, jsonOk, jsonError } from '@/lib/api';
import { createAdminClient } from '@/lib/supabase/admin';
import { decryptToken } from '@/lib/security/encryption';
import { metaGraph, MetaApiError } from '@/lib/meta/graph';

/** GET /api/comments?post_id=<meta_post_id>&page_id=<uuid> — permitted comments on a post. */
export async function GET(req: Request) {
  const auth = await requireUser(req);
  if ('response' in auth) return auth.response;
  const url = new URL(req.url);
  const postId = url.searchParams.get('post_id');
  const pageUuid = url.searchParams.get('page_id');
  if (!postId || !pageUuid) return jsonError('post_id and page_id are required', 400);

  const admin = createAdminClient();
  const { data: page } = await admin
    .from('facebook_pages')
    .select('id, page_id, access_token_encrypted, status')
    .eq('id', pageUuid)
    .eq('user_id', auth.user.id)
    .single();
  if (!page) return jsonError('Page not found', 404);
  if (page.status !== 'connected') return jsonError('Page is not connected', 400);

  let token: string;
  try {
    token = decryptToken(page.access_token_encrypted);
  } catch {
    return jsonError('Stored Page token could not be decrypted. Please reconnect Facebook.', 401);
  }

  try {
    const comments = await metaGraph.getComments(postId, token);
    return jsonOk({ comments });
  } catch (err) {
    if (err instanceof MetaApiError) {
      if (err.isTokenExpired) return jsonError('Page access token expired. Please reconnect Facebook.', 401, { token_expired: true });
      if (err.isPermissionError) return jsonError('Missing Facebook permission to read comments. Please reconnect and grant it.', 403, { permission_error: true });
      return jsonError(err.message, 400);
    }
    return jsonError('Failed to load comments', 500);
  }
}
