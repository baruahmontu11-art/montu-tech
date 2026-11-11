import { requireUser, jsonOk, jsonError, checkUserRateLimit } from '@/lib/api';
import { createAdminClient } from '@/lib/supabase/admin';
import { retrySchema, parseJsonBody } from '@/lib/security/validation';
import { publishScheduledPost } from '@/lib/posts/publish';
import { writeAuditLog } from '@/lib/security/audit';

/** POST /api/posts/retry — retry a failed scheduled post (resets attempts, republishes). */
export async function POST(req: Request) {
  const auth = await requireUser(req);
  if ('response' in auth) return auth.response;
  const limited = checkUserRateLimit(auth.user.id, 'posts-retry', 10, 60_000);
  if (limited) return limited;
  const body = await parseJsonBody<unknown>(req);
  const parsed = retrySchema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid post_id', 400);

  const admin = createAdminClient();
  const { data: post } = await admin
    .from('scheduled_posts')
    .select('id, status, attempts')
    .eq('id', parsed.data.post_id)
    .eq('user_id', auth.user.id)
    .single();
  if (!post) return jsonError('Post not found', 404);
  if (post.status !== 'failed') return jsonError('Only failed posts can be retried', 400);
  if ((post.attempts ?? 0) >= 3) return jsonError('Maximum retry attempts reached. Please edit and re-schedule the post.', 400);

  await admin.from('scheduled_posts').update({
    status: 'scheduled',
    scheduled_for: new Date().toISOString(),
    attempts: 0,
    error_message: null,
  }).eq('id', post.id);

  const result = await publishScheduledPost(post.id, auth.user.id);
  if (!result.success) {
    await admin.from('scheduled_posts').update({
      status: 'failed',
      attempts: 1,
      error_message: result.error,
    }).eq('id', post.id);
    return jsonError(result.error ?? 'Retry failed', 400, { token_expired: result.tokenExpired ?? false });
  }
  await writeAuditLog({ user_id: auth.user.id, action: 'post.retry', resource_type: 'scheduled_post', resource_id: post.id });
  return jsonOk({ success: true, meta_post_id: result.metaPostId });
}
