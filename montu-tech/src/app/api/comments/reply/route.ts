import { requireUser, jsonOk, jsonError, checkUserRateLimit } from '@/lib/api';
import { createAdminClient } from '@/lib/supabase/admin';
import { decryptToken } from '@/lib/security/encryption';
import { commentReplySchema, parseJsonBody } from '@/lib/security/validation';
import { metaGraph, MetaApiError } from '@/lib/meta/graph';
import { writeAuditLog } from '@/lib/security/audit';

/** POST /api/comments/reply — reply to a comment on the user's Page. */
export async function POST(req: Request) {
  const auth = await requireUser(req);
  if ('response' in auth) return auth.response;
  const limited = checkUserRateLimit(auth.user.id, 'comments-reply', 20, 60_000);
  if (limited) return limited;
  const body = await parseJsonBody<unknown>(req);
  const parsed = commentReplySchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? 'Invalid reply', 400);

  const admin = createAdminClient();
  const { data: page } = await admin
    .from('facebook_pages')
    .select('id, page_id, access_token_encrypted, status')
    .eq('id', parsed.data.page_id)
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
    const res = await metaGraph.replyToComment(parsed.data.comment_id, token, parsed.data.message);
    await writeAuditLog({ user_id: auth.user.id, action: 'comment.reply', resource_type: 'comment', resource_id: parsed.data.comment_id });
    return jsonOk({ success: true, reply_id: res.id });
  } catch (err) {
    if (err instanceof MetaApiError) {
      if (err.isTokenExpired) return jsonError('Page access token expired. Please reconnect Facebook.', 401, { token_expired: true });
      if (err.isPermissionError) return jsonError('Missing Facebook permission to reply to comments.', 403, { permission_error: true });
      return jsonError(err.message, 400);
    }
    return jsonError('Failed to post reply', 500);
  }
}
