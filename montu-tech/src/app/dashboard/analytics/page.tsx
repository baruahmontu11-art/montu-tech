'use client';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

type PageRow = { id: string; page_name?: string; name?: string; status?: string };
type MetricRow = { name: string; values?: { value?: number }[] };

const LABELS: Record<string, string> = {
  page_impressions: 'Impressions',
  page_engaged_users: 'Engaged Users',
  page_post_engagements: 'Post Engagements',
  page_fans: 'Followers',
  page_views_total: 'Page Views',
  page_actions_post_reactions_total: 'Reactions',
};

export default function AnalyticsPage() {
  const [pages, setPages] = useState<PageRow[]>([]);
  const [pageId, setPageId] = useState('');
  const [since, setSince] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10); });
  const [until, setUntil] = useState(() => new Date().toISOString().slice(0, 10));
  const [metrics, setMetrics] = useState<MetricRow[]>([]);
  const [unavailable, setUnavailable] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/meta/pages');
      const data = await res.json().catch(() => ({}));
      if (res.ok) { const list = data.pages || data.data || []; setPages(list); if (list[0]) setPageId(list[0].id); }
    })();
  }, []);

  async function load() {
    if (!pageId) { setError('Connect a Facebook Page first.'); return; }
    setLoading(true); setError(''); setNote('');
    try {
      const res = await fetch(`/api/analytics?page_id=${pageId}&since=${since}&until=${until}`);
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || d.message || 'Failed to load analytics.');
      setMetrics(d.metrics || []);
      setUnavailable(d.unavailable || []);
      setNote(d.note || d.unavailable_reason || '');
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load analytics.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { if (pageId) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [pageId]);

  const total = (m: MetricRow) => (m.values || []).reduce((s, v) => s + Number(v.value ?? 0), 0);

  return (
    <div>
      <Header title="Analytics" subtitle="Only metrics actually returned by the Meta API are shown" />
      <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <Card glass>
          <div className="flex flex-wrap items-end gap-3">
            <div><label className="label" htmlFor="page">Facebook Page</label><select id="page" className="input-field" value={pageId} onChange={(e) => setPageId(e.target.value)}>{pages.length === 0 && <option value="">No Pages connected</option>}{pages.map((p) => <option key={p.id} value={p.id}>{p.page_name || p.name}</option>)}</select></div>
            <div><label className="label" htmlFor="since">From</label><input id="since" type="date" className="input-field" value={since} onChange={(e) => setSince(e.target.value)} /></div>
            <div><label className="label" htmlFor="until">To</label><input id="until" type="date" className="input-field" value={until} onChange={(e) => setUntil(e.target.value)} /></div>
            <button onClick={load} className="btn-primary">Load Analytics</button>
          </div>
        </Card>
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {note && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{note}</p>}
        {loading ? <p className="text-sm text-slate-500">Loading analytics…</p> : pages.length === 0 ? (
          <Card><p className="text-center text-sm text-slate-500">No Pages connected yet. Connect Facebook to see live data.</p></Card>
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Object.keys(LABELS).map((key) => {
                const m = metrics.find((x) => x.name === key);
                const isUnavailable = unavailable.includes(key);
                return (
                  <Card key={key} glass>
                    <p className="text-sm text-slate-500">{LABELS[key]}</p>
                    {m ? <p className="mt-1 text-3xl font-bold text-violet-700">{total(m).toLocaleString()}</p>
                      : <><p className="mt-1 text-lg font-semibold text-slate-400">—</p><Badge tone="amber">{isUnavailable ? 'Not available via current permissions' : 'No data returned'}</Badge></>}
                  </Card>
                );
              })}
            </div>
            <Card>
              <h2 className="font-semibold">Post & Video Performance</h2>
              <p className="mt-2 text-sm text-slate-500">Post and video performance is shown here only when returned by the authorised Meta endpoints for the selected Page and period; otherwise it is labelled not available — never estimated.</p>
              {metrics.length === 0 && <p className="mt-3 rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">No metric data returned for this period.</p>}
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
