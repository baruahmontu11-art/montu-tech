import { requireAdminUser } from '@/lib/admin';
import { jsonOk, jsonError } from '@/lib/api';

/** GET /api/admin/stats — platform totals (admin only). */
export async function GET(req: Request) {
  const auth = await requireAdminUser(req);
  if ('response' in auth) return auth.response;
  const admin = auth.admin;
  const [users, pages, posts, tickets, payouts, payments] = await Promise.all([
    admin.from('profiles').select('id', { count: 'exact', head: true }),
    admin.from('facebook_pages').select('id', { count: 'exact', head: true }),
    admin.from('published_posts').select('id', { count: 'exact', head: true }),
    admin.from('support_tickets').select('id, status').eq('status', 'pending'),
    admin.from('payout_requests').select('id, status').eq('status', 'pending'),
    admin.from('payments').select('amount').eq('status', 'paid'),
  ]);
  if (users.error) return jsonError(users.error.message, 500);
  const totalRevenue = (payments.data ?? []).reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
  const activeUsers = await admin.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active');
  return jsonOk({
    total_users: users.count ?? 0,
    active_subscribers: activeUsers.count ?? 0,
    connected_pages: pages.count ?? 0,
    total_published_posts: posts.count ?? 0,
    pending_tickets: tickets.data?.length ?? 0,
    pending_payout_requests: payouts.data?.length ?? 0,
    total_revenue_inr: totalRevenue,
  });
}
