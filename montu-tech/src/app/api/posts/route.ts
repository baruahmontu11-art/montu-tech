import { requireUser, jsonOk, jsonError, checkUserRateLimit } from '@/lib/api';
import { createAdminClient } from '@/lib/supabase/admin';
import { postSchema, parseJsonBody } from '@/lib/security/validation';
import { writeAuditLog } from '@/lib/security/audit';
import { planFromSubscription } from '@/lib/plans';

/** GET /api/posts — list the user's posts (drafts, scheduled, published, failed). */
export async function GET(req: Request) {
  const auth = await requireUser(req);
  if ('response' in auth) return auth.response;
  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const pageId = url.searchParams.get('page_id');
  const admin = createAdminClient();
  let q = admin
    .from('scheduled_posts')
    .select('id, page_id, content, media_url, media_type, link_url, status, scheduled_for, published_post_id, error_message, attempts, created_at, updated_at')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(100);
  if (status) q = q.eq('status', status);
  if (pageId) q = q.eq('page_id', pageId);
  const { data, error } = await q;
  if (error) return jsonError(error.message, 500);
  return jsonOk({ posts: data ?? [] });
}

/** POST /api/posts — create a draft or scheduled post (Zod-validated, plan-limited). */
export async function POST(req: Request) {
  const auth = await requireUser(req);
  if ('response' in auth) return auth.response;
  const limited = checkUserRateLimit(auth.user.id, 'posts-create', 20, 60_000);
  if (limited) return limited;
  const body = await parseJsonBody<unknown>(req);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? 'Invalid post', 400);
  const input = parsed.data;

  const admin = createAdminClient();
  // Verify the Page belongs to this user.
  const { data: page } = await admin
    .from('facebook_pages')
    .select('id, page_name, status')
    .eq('id', input.page_id)
    .eq('user_id', auth.user.id)
    .single();
  if (!page) return jsonError('Page not found or not connected', 404);
  if (page.status !== 'connected') return jsonError('Page is not connected', 400);

  // Plan limit: scheduled posts this month.
  const { data: sub } = await admin
    .from('subscriptions')
    .select('plan_id, status')
    .eq('user_id', auth.user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  const plan = planFromSubscription(sub ?? null);
  if (input.status === 'scheduled') {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const { count } = await admin
      .from('scheduled_posts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', auth.user.id)
      .eq('status', 'scheduled')
      .gte('created_at', monthStart.toISOString());
    if ((count ?? 0) >= plan.scheduledPostsPerMonth) {
      return jsonError(`Your ${plan.name} plan allows ${plan.scheduledPostsPerMonth} scheduled posts per month. Please upgrade.`, 403);
    }
    if (new Date(input.scheduled_for!) <= new Date()) {
      return jsonError('scheduled_for must be in the future', 400);
    }
  }

  const { data, error } = await admin
    .from('scheduled_posts')
    .insert({
      user_id: auth.user.id,
      page_id: input.page_id,
      content: input.content,
      media_url: input.media_url ?? null,
      media_type: input.media_type,
      link_url: input.link_url ?? null,
      status: input.status,
      scheduled_for: input.scheduled_for ?? null,
      attempts: 0,
    })
    .select()
    .single();
  if (error) return jsonError(error.message, 500);
  await writeAuditLog({ user_id: auth.user.id, action: 'post.create', resource_type: 'scheduled_post', resource_id: data.id, details: { status: input.status } });
  return jsonOk({ post: data }, 201);
}
