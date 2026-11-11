import { requireUser, jsonOk, jsonError } from '@/lib/api';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/analytics/monetization?page_id=<uuid>
 * Monetization: Meta does NOT expose earnings, balances, payout history or
 * eligibility through the public Graph API. This endpoint therefore returns
 * an explicit empty/unavailable state (plus any payout-assistance requests
 * the user has filed in-app) — it never fabricates earnings figures.
 */
export async function GET(req: Request) {
  const auth = await requireUser(req);
  if ('response' in auth) return auth.response;
  const url = new URL(req.url);
  const pageUuid = url.searchParams.get('page_id');
  const admin = createAdminClient();

  let page = null;
  if (pageUuid) {
    const { data } = await admin
      .from('facebook_pages')
      .select('id, page_name, status')
      .eq('id', pageUuid)
      .eq('user_id', auth.user.id)
      .single();
    if (!data) return jsonError('Page not found', 404);
    page = data;
  }

  const { data: payoutRequests } = await admin
    .from('payout_requests')
    .select('id, type, status, created_at')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  return jsonOk({
    page,
    available: false,
    earnings: null,
    balance: null,
    payout_history: [],
    eligibility: null,
    unavailable_reason:
      'Meta does not provide earnings, balances, payout history or monetization eligibility through the public Graph API. Check monetization status in Meta Business Suite / Professional Dashboard. Payout changes are handled as support requests in Montu Tech — see your payout requests below.',
    payout_requests: payoutRequests ?? [],
  });
}
