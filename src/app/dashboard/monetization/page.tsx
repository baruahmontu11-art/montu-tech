'use client';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

type PayoutReq = { id: string; type?: string; status?: string; created_at?: string };

export default function MonetizationPage() {
  const [reason, setReason] = useState('');
  const [payoutRequests, setPayoutRequests] = useState<PayoutReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/analytics/monetization');
        const d = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(d.error || d.message || 'Failed to load monetization data.');
        setReason(d.unavailable_reason || '');
        setPayoutRequests(d.payout_requests || []);
      } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load monetization data.'); }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <div>
      <Header title="Monetization" subtitle="Eligible earnings insights — only what Meta returns" />
      <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <Card glass>
          <h2 className="font-semibold">Monetization Status</h2>
          {loading ? <p className="mt-2 text-sm text-slate-500">Loading…</p> : (
            <><div className="mt-2"><Badge tone="amber">Not available via public Graph API</Badge></div>
            {reason && <p className="mt-3 text-sm text-slate-600">{reason}</p>}</>
          )}
          <p className="mt-3 text-sm text-slate-600">Montu Tech never fabricates earnings, balances, payout history or monetization eligibility. Figures appear here only when the authorised Meta API returns them.</p>
        </Card>
        <Card>
          <h2 className="font-semibold">Earnings</h2>
          <p className="mt-2 rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">No earnings data returned by Meta.</p>
        </Card>
        <Card>
          <h2 className="font-semibold">Your Payout Requests</h2>
          {payoutRequests.length === 0 ? <p className="mt-2 text-sm text-slate-500">No payout assistance requests filed yet.</p> : (
            <ul className="mt-3 space-y-2">{payoutRequests.map((r) => <li key={r.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2 text-sm"><span>{r.type}</span><Badge tone={r.status === 'completed' ? 'green' : 'amber'}>{r.status || 'pending'}</Badge></li>)}</ul>
          )}
          <a href="/dashboard/payout" className="btn-primary mt-4">Open Payout Assistance</a>
        </Card>
      </div>
    </div>
  );
}
