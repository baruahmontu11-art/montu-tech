'use client';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

type PageRow = { id: string; page_name?: string; name?: string };
type CommentItem = { id: string; message?: string; from?: { name?: string }; created_time?: string };

export default function CommentsPage() {
  const [pages, setPages] = useState<PageRow[]>([]);
  const [pageId, setPageId] = useState('');
  const [postId, setPostId] = useState('');
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [reply, setReply] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState('');

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/meta/pages');
      const data = await res.json().catch(() => ({}));
      if (res.ok) { const list = data.pages || data.data || []; setPages(list); if (list[0]) setPageId(list[0].id); }
    })();
  }, []);

  async function load() {
    if (!pageId || !postId.trim()) { setError('Choose a Page and enter a Facebook post ID.'); return; }
    setLoading(true); setError(''); setLoaded(true);
    try {
      const res = await fetch(`/api/comments?post_id=${encodeURIComponent(postId.trim())}&page_id=${pageId}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to load comments.');
      setComments(data.comments || data.data || []);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load comments.'); }
    finally { setLoading(false); }
  }

  async function sendReply(id: string) {
    const text = (reply[id] || '').trim();
    if (!text) return;
    setBusyId(id); setError(''); setSuccess('');
    try {
      const res = await fetch('/api/comments/reply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ comment_id: id, page_id: pageId, message: text }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to send reply.');
      setSuccess('Reply sent.');
      setReply({ ...reply, [id]: '' });
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to send reply.'); }
    finally { setBusyId(''); }
  }

  return (
    <div>
      <Header title="Comments Manager" subtitle="Reply to permitted comments on your Pages" />
      <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <Card glass>
          <div className="flex flex-wrap items-end gap-3">
            <div><label className="label" htmlFor="page">Facebook Page</label><select id="page" className="input-field" value={pageId} onChange={(e) => setPageId(e.target.value)}>{pages.length === 0 && <option value="">No Pages connected</option>}{pages.map((p) => <option key={p.id} value={p.id}>{p.page_name || p.name}</option>)}</select></div>
            <div className="min-w-[220px] flex-1"><label className="label" htmlFor="postId">Facebook Post ID</label><input id="postId" className="input-field" placeholder="e.g. 123456789012345_987654321" value={postId} onChange={(e) => setPostId(e.target.value)} /></div>
            <Button loading={loading} onClick={load}>Load Comments</Button>
          </div>
        </Card>
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {success && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p>}
        {!loaded ? <Card><p className="text-center text-sm text-slate-500">Enter a post ID to load its permitted comments. Connect Facebook to see live data.</p></Card>
        : loading ? <p className="text-sm text-slate-500">Loading comments…</p>
        : comments.length === 0 ? <Card><p className="text-center text-sm text-slate-500">No comments returned for this post.</p></Card> : (
          <div className="space-y-4">{comments.map((c) => (
            <Card key={c.id}>
              <p className="text-sm font-semibold">{c.from?.name || 'Facebook user'}</p>
              <p className="mt-1 text-sm text-slate-700">{c.message}</p>
              {c.created_time && <p className="mt-1 text-xs text-slate-400">{c.created_time}</p>}
              <div className="mt-3 flex gap-2">
                <input className="input-field" placeholder="Write a reply…" value={reply[c.id] || ''} onChange={(e) => setReply({ ...reply, [c.id]: e.target.value })} />
                <Button loading={busyId === c.id} disabled={!(reply[c.id] || '').trim()} onClick={() => sendReply(c.id)}>Reply</Button>
              </div>
            </Card>
          ))}</div>
        )}
      </div>
    </div>
  );
}
