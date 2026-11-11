import { requireUser, jsonOk, jsonError, checkUserRateLimit } from '@/lib/api';
import { publishSchema, parseJsonBody } from '@/lib/security/validation';
import { publishScheduledPost } from '@/lib/posts/publish';
import { writeAuditLog } from '@/lib/security/audit';

/** POST /api/posts/publish — publish a draft/scheduled post to Facebook now. */
export async function POST(req: Request) {
  const auth = await requireUser(req);
  if ('response' in auth) return auth.response;
  const limited = checkUserRateLimit(auth.user.id, 'posts-publish', 10, 60_000);
  if (limited) return limited;
  const body = await parseJsonBody<unknown>(req);
  const parsed = publishSchema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid post_id', 400);

  const result = await publishScheduledPost(parsed.data.post_id, auth.user.id);
  if (!result.success) {
    const status = result.tokenExpired ? 401 : result.permissionError ? 403 : 400;
    return jsonError(result.error ?? 'Publishing failed', status, {
      permission_error: result.permissionError ?? false,
      token_expired: result.tokenExpired ?? false,
    });
  }
  await writeAuditLog({ user_id: auth.user.id, action: 'post.publish', resource_type: 'scheduled_post', resource_id: parsed.data.post_id, details: { meta_post_id: result.metaPostId } });
  return jsonOk({ success: true, meta_post_id: result.metaPostId });
}
