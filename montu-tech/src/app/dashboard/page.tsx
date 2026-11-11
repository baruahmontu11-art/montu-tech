'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

type PageRow = { id: string; page_name?: string; name?: string; page_id: string; status?: string; connected?: boolean };

export default function DashboardPage() {
  const [pages, setPages] = useState<PageRow[]>([]);
  const [totalPosts, setTotalPosts] = useState(0);
  const [tickets, setTickets] = useState<{ id: string; subject?: string; status?: string; created_at?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [pRes, oRes] = await Promise.all([fetch('/api/meta/pages'), fetch('/api/analytics/overview')]);
        const pData = await pRes.json().catch(() => ({}));
        if (!pRes.ok) throw new Error(pData.error || pData.message || 'Failed to load connected pages.');
        setPages(pData.pages || pData.data || []);
        if (oRes.ok) {
          const o = await oRes.json().catch(() => ({}));
          setTotalPosts(o.total_published_posts ?? 0);
          setTickets(o.recent_tickets || []);
          if (o.pages?.length) setPages(o.pages);
        } else {
          const oData = await oRes.json().catch(() => ({}));
          if (oData.error) setError(oData.error || oData.message || '');
        }
      } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load dashboard.'); }
      finally { setLoading(false); }
    })();
  }, []);

  const nameOf = (p: PageRow) => p.page_name || p.name || 'Facebook Page';
  const isConnected = (p: PageRow) => p.connected ?? p.status === 'connected';

  return (
    <div>
      <Header title="Overview" subtitle="Your Facebook Pages at a glance" />
      <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {loading ? <p className="text-sm text-slate-500">Loading your dashboard…</p> : (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <Card glass><p className="text-sm text-slate-500">Connected Pages</p><p className="mt-1 text-3xl font-bold text-violet-700">{pages.length}</p></Card>
              <Card glass><p className="text-sm text-slate-500">Total Published Posts</p><p className="mt-1 text-3xl font-bold text-violet-700">{totalPosts}</p></Card>
              <Card glass><p className="text-sm text-slate-500">Insights</p><p className="mt-1 text-lg font-semibold">{pages.length ? 'Live data available in Analytics' : 'Connect Facebook to see live data'}</p></Card>
              <Card glass><p className="text-sm text-slate-500">Support Requests</p><p className="mt-1 text-3xl font-bold text-violet-700">{tickets.length}</p><Link href="/dashboard/support" className="text-sm text-violet-700 hover:underline">View support →</Link></Card>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <Card>
                <div className="flex items-center justify-between"><h2 className="font-semibold">Connected Facebook Pages</h2><Link href="/dashboard/pages" className="text-sm text-violet-700 hover:underline">Manage</Link></div>
                {pages.length === 0 ? (
                  <div className="mt-4 rounded-xl bg-slate-50 p-5 text-center"><p className="text-sm text-slate-600">No Pages connected yet.</p><p className="mt-1 text-xs text-slate-400">Connect Facebook to see live data.</p><Link href="/dashboard/pages" className="btn-primary mt-4">Connect Facebook</Link></div>
                ) : (
                  <ul className="mt-4 space-y-3">{pages.map((p) => <li key={p.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"><span><span className="block font-medium">{nameOf(p)}</span><span className="text-xs text-slate-400">Page ID: {p.page_id}</span></span><Badge tone={isConnected(p) ? 'green' : 'amber'}>{isConnected(p) ? 'Connected' : p.status || 'Disconnected'}</Badge></li>)}</ul>
                )}
              </Card>
              <Card>
                <h2 className="font-semibold">Recent Activities</h2>
                {tickets.length === 0 ? (
                  <div className="mt-4 rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">No recent activity yet. Publish or schedule your first post from Content Studio.</div>
                ) : (
                  <ul className="mt-4 space-y-3">{tickets.map((t) => <li key={t.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"><span className="text-sm">{t.subject || 'Support ticket'}</span><Badge tone={t.status === 'completed' ? 'green' : 'amber'}>{t.status || 'pending'}</Badge></li>)}</ul>
                )}
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
