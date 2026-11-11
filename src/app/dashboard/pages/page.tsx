'use client';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

type PageRow = { id: string; page_name?: string; name?: string; page_id: string; status?: string; connected?: boolean };

export default function PagesManagerPage() {
  const [pages, setPages] = useState<PageRow[]>([]);
  const [tokenExpires, setTokenExpires] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  async function load() {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/meta/pages');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to load Pages.');
      setPages(data.pages || data.data || []);
      if (data.connection?.token_expires_at) setTokenExpires(data.connection.token_expires_at);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load Pages.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function disconnect(id: string) {
    setBusyId(id); setError('');
    try {
      const res = await fetch('/api/meta/pages', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ page_id: id }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to disconnect Page.');
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to disconnect Page.'); }
    finally { setBusyId(''); }
  }

  const nameOf = (p: PageRow) => p.page_name || p.name || 'Facebook Page';
  const isConnected = (p: PageRow) => p.connected ?? p.status === 'connected';

  return (
    <div>
      <Header title="Pages Manager" subtitle="Connect and manage your Facebook Pages" />
      <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <Card glass>
          <h2 className="font-semibold">Connect Facebook</h2>
          <p className="mt-1 text-sm text-slate-600">Connect via the official Meta Facebook Login. We never collect your Facebook password. Only the permissions pages_show_list, pages_read_engagement and pages_manage_posts are requested.</p>
          {tokenExpires && <p className="mt-2 text-xs text-slate-500">Access token expires: {tokenExpires}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <a href="/api/meta/connect" className="btn-primary">Connect Facebook</a>
            <a href="/api/meta/connect" className="btn-secondary">Reconnect (refresh token)</a>
          </div>
        </Card>
        {loading ? <p className="text-sm text-slate-500">Loading Pages…</p> : pages.length === 0 ? (
          <Card><p className="text-center text-sm text-slate-500">No Pages connected yet. Connect Facebook to see live data.</p></Card>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {pages.map((p) => (
              <Card key={p.id}>
                <div className="flex items-start justify-between gap-3">
                  <div><h3 className="font-semibold">{nameOf(p)}</h3><p className="text-xs text-slate-400">Page ID: {p.page_id}</p></div>
                  <Badge tone={isConnected(p) ? 'green' : 'amber'}>{isConnected(p) ? 'Connected' : p.status || 'Disconnected'}</Badge>
                </div>
                <div className="mt-4 flex gap-2">
                  <a href="/api/meta/connect" className="btn-secondary !px-3 !py-2 text-xs">Reconnect</a>
                  <Button variant="danger" loading={busyId === p.id} onClick={() => disconnect(p.id)} className="!px-3 !py-2 text-xs">Disconnect</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
