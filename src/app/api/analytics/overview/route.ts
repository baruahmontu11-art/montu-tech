import { requireUser, jsonOk, jsonError } from '@/lib/api';
import { createAdminClient } from '@/lib/supabase/admin';

/** GET /api/analytics/overview — dashboard summary from the user's own DB rows (no Meta fabrication). */
export async function GET(req: Request) {
  const auth = await requireUser(req);
  if ('response' in auth) return auth.response;
  const admin = createAdminClient();
  const userId = auth.user.id;

  const [pages, published, scheduled, tickets] = await Promise.all([
    admin.from('facebook_pages').select('id, page_name, status').eq('user_id', userId),
    admin.from('published_posts').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    admin.from('scheduled_posts').select('id, status').eq('user_id', userId),
    admin.from('support_tickets').select('id, status').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
  ]);
  if (pages.error) return jsonError(pages.error.message, 500);

  const scheduledByStatus: Record<string, number> = {};
  for (const p of scheduled.data ?? []) scheduledByStatus[p.status] = (scheduledByStatus[p.status] ?? 0) + 1;

  const { data: latestInsights } = await admin
    .from('page_insights')
    .select('page_id, metrics, fetched_at')
    .eq('user_id', userId)
    .order('fetched_at', { ascending: false })
    .limit(10);

  return jsonOk({
    connected_pages: pages.data?.length ?? 0,
    pages: pages.data ?? [],
    total_published_posts: published.count ?? 0,
    scheduled_by_status: scheduledByStatus,
    recent_tickets: tickets.data ?? [],
    latest_insights: latestInsights ?? [],
    insights_note: 'Insights shown here are the last snapshots returned by the Meta Graph API. No metrics are estimated.',
  });
}
