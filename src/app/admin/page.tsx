'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Header from '@/components/Header';

type Stats = { total_users?: number; active_subscribers?: number; connected_pages?: number; total_published_posts?: number; pending_tickets?: number; pending_payout_requests?: number; total_revenue_inr?: number };

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/stats');
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || data.message || 'Failed to load admin stats. Admin access is server-side only.');
        setStats(data);
      } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load admin stats.'); }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <div>
      <Header title="Admin Dashboard" subtitle="Platform overview — server-side admin access only" />
      <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {loading ? <p className="text-sm text-slate-500">Loading stats…</p> : stats ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Card glass><p className="text-sm text-slate-500">Total Registered Users</p><p className="mt-1 text-3xl font-bold text-violet-700">{stats.total_users ?? '—'}</p></Card>
            <Card glass><p className="text-sm text-slate-500">Active Subscribers</p><p className="mt-1 text-3xl font-bold text-violet-700">{stats.active_subscribers ?? '—'}</p></Card>
            <Card glass><p className="text-sm text-slate-500">Connected Pages</p><p className="mt-1 text-3xl font-bold text-violet-700">{stats.connected_pages ?? '—'}</p></Card>
            <Card glass><p className="text-sm text-slate-500">Total Published Posts</p><p className="mt-1 text-3xl font-bold text-violet-700">{stats.total_published_posts ?? '—'}</p></Card>
            <Card glass><p className="text-sm text-slate-500">Pending Tickets</p><p className="mt-1 text-3xl font-bold text-violet-700">{stats.pending_tickets ?? '—'}</p></Card>
            <Card glass><p className="text-sm text-slate-500">Pending Payout Requests</p><p className="mt-1 text-3xl font-bold text-violet-700">{stats.pending_payout_requests ?? '—'}</p></Card>
            <Card glass><p className="text-sm text-slate-500">Total Revenue (INR)</p><p className="mt-1 text-3xl font-bold text-violet-700">{stats.total_revenue_inr == null ? '—' : `₹${Number(stats.total_revenue_inr).toLocaleString()}`}</p></Card>
          </div>
        ) : <Card><p className="text-sm text-slate-500">No stats available.</p></Card>}
        <div className="grid gap-5 md:grid-cols-3">
          <Card><h2 className="font-semibold">Users</h2><p className="mt-1 text-sm text-slate-500">Manage, suspend and activate accounts.</p><Link href="/admin/users" className="mt-3 inline-block text-sm text-violet-700 hover:underline">Manage users →</Link></Card>
          <Card><h2 className="font-semibold">Support Tickets</h2><p className="mt-1 text-sm text-slate-500">Review tickets and payout requests.</p><Link href="/admin/tickets" className="mt-3 inline-block text-sm text-violet-700 hover:underline">View tickets →</Link></Card>
          <Card><h2 className="font-semibold">Audit Logs</h2><p className="mt-1 text-sm text-slate-500">See who did what, and when.</p><Link href="/admin/audit-logs" className="mt-3 inline-block text-sm text-violet-700 hover:underline">View audit logs →</Link></Card>
        </div>
      </div>
    </div>
  );
}
