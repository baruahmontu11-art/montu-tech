'use client';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Card from '@/components/ui/Card';

type Stats = { total_users?: number; active_subscribers?: number; total_revenue_inr?: number };
type Sub = { id: string; user_id: string; status: string; current_period_end?: string | null; plans?: { name?: string } | null; profiles?: { full_name?: string | null; email?: string | null } | null };

const PLANS = [
  { name: 'Free', price: '₹0', features: '1 Page · 10 scheduled posts / month' },
  { name: 'Basic', price: '₹499/mo', features: '3 Pages · 100 scheduled posts / month' },
  { name: 'Premium', price: '₹999/mo', features: '10 Pages · Unlimited scheduled posts' },
  { name: 'Enterprise', price: 'Custom', features: 'Unlimited Pages · Team access' },
];

export default function AdminSubscriptionsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    try {
      const [sRes, subRes] = await Promise.all([fetch('/api/admin/stats'), fetch('/api/admin/subscriptions?limit=50')]);
      const sData = await sRes.json().catch(() => ({}));
      const subData = await subRes.json().catch(() => ({}));
      if (!sRes.ok) throw new Error(sData.error || 'Failed to load subscription stats.');
      if (!subRes.ok) throw new Error(subData.error || 'Failed to load subscriptions.');
      setStats(sData);
      setSubs(subData.subscriptions ?? []);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load subscriptions.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const changeStatus = async (id: string, status: string) => {
    setNotice('');
    const res = await fetch('/api/admin/subscriptions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription_id: id, status }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setError(data.error || 'Failed to update subscription.'); return; }
    setNotice('Subscription updated.');
    setSubs((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
  };

  return (
    <div>
      <Header title="Subscriptions" subtitle="Plans, activations, expiry and billing records" />
      <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {notice && <p className="rounded-xl bg-green-50 p-3 text-sm text-green-700">{notice}</p>}
        {loading ? <p className="text-sm text-slate-500">Loading subscriptions…</p> : (
          <div className="grid gap-5 sm:grid-cols-3">
            <Card glass><p className="text-sm text-slate-500">Active Subscribers</p><p className="mt-1 text-3xl font-bold text-violet-700">{stats?.active_subscribers ?? '—'}</p></Card>
            <Card glass><p className="text-sm text-slate-500">Total Registered Users</p><p className="mt-1 text-3xl font-bold text-violet-700">{stats?.total_users ?? '—'}</p></Card>
            <Card glass><p className="text-sm text-slate-500">Total Revenue (INR)</p><p className="mt-1 text-3xl font-bold text-violet-700">{stats?.total_revenue_inr == null ? '—' : `₹${Number(stats.total_revenue_inr).toLocaleString()}`}</p></Card>
          </div>
        )}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((p) => <Card key={p.name} glass><p className="font-semibold">{p.name}</p><p className="mt-1 text-2xl font-bold text-violet-700">{p.price}</p><p className="mt-1 text-sm text-slate-500">{p.features}</p></Card>)}
        </div>
        <Card>
          <h2 className="font-semibold">Subscriber Records</h2>
          {subs.length === 0 && !loading ? (
            <p className="mt-2 text-sm text-slate-500">No subscriptions yet. New sign-ups start on the Free plan.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {subs.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
                  <div>
                    <p className="text-sm font-medium">{s.profiles?.full_name || s.profiles?.email || s.user_id}</p>
                    <p className="text-xs text-slate-500">{s.plans?.name ?? '—'} · {s.current_period_end ? `expires ${new Date(s.current_period_end).toLocaleDateString()}` : 'no expiry set'}</p>
                  </div>
                  <select value={s.status} onChange={(e) => changeStatus(s.id, e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
                    {['active', 'trialing', 'past_due', 'cancelled', 'expired'].map((st) => <option key={st} value={st}>{st}</option>)}
                  </select>
                </div>
              ))}
            </div>
          )}
          <p className="mt-3 text-xs text-slate-400">Payments are verified server-side via Razorpay webhooks. No payment is marked successful based on frontend confirmation alone.</p>
        </Card>
      </div>
    </div>
  );
}
