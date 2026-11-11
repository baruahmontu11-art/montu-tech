'use client';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

type Post = { id: string; content?: string; message?: string; status?: string; scheduled_for?: string; scheduled_at?: string; page_id?: string; error_message?: string; error?: string };

export default function SchedulerPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busyId, setBusyId] = useState('');

  async function load() {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/posts');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to load scheduled posts.');
      setPosts(data.posts || data.data || []);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load scheduled posts.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function retry(id: string) {
    setBusyId(id); setError(''); setSuccess('');
    try {
      const res = await fetch('/api/posts/retry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ post_id: id }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || 'Retry failed.');
      setSuccess('Post retried and published.');
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Retry failed.'); }
    finally { setBusyId(''); }
  }

  const tone = (s?: string) => (s === 'published' ? 'green' : s === 'failed' ? 'red' : s === 'scheduled' ? 'blue' : 'grey') as 'green' | 'red' | 'blue' | 'grey';

  return (
    <div>
      <Header title="Scheduler" subtitle="Scheduled posts, drafts and publishing queue" />
      <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {success && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p>}
        <Card glass><p className="text-sm text-slate-600">Scheduled posts are published by a background worker and job queue — they go out even when you close the browser. Failed jobs can be retried from this queue (up to 3 attempts).</p></Card>
        {loading ? <p className="text-sm text-slate-500">Loading queue…</p> : posts.length === 0 ? (
          <Card><p className="text-center text-sm text-slate-500">No scheduled or draft posts yet. Create one in Content Studio.</p></Card>
        ) : (
          <div className="space-y-4">{posts.map((p) => (
            <Card key={p.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="text-sm text-slate-700">{p.content || p.message || '(No text)'}</p><p className="mt-1 text-xs text-slate-400">{(p.scheduled_for || p.scheduled_at) ? `Scheduled: ${p.scheduled_for || p.scheduled_at}` : 'No schedule set'}</p>{(p.error_message || p.error) && <p className="mt-1 text-xs text-red-600">{p.error_message || p.error}</p>}</div>
                <div className="flex items-center gap-2"><Badge tone={tone(p.status)}>{p.status || 'scheduled'}</Badge>{p.status === 'failed' && <Button loading={busyId === p.id} onClick={() => retry(p.id)} className="!px-3 !py-1.5 text-xs">Retry</Button>}</div>
              </div>
            </Card>
          ))}</div>
        )}
      </div>
    </div>
  );
}
