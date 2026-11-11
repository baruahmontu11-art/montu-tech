'use client';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

type PageRow = { id: string; page_name?: string; name?: string; page_id: string; status?: string };

export default function StudioPage() {
  const [pages, setPages] = useState<PageRow[]>([]);
  const [pageId, setPageId] = useState(''); // facebook_pages.id (UUID) — what /api/posts expects
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [scheduledAt, setScheduledAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/meta/pages');
      const data = await res.json().catch(() => ({}));
      if (res.ok) { const list = data.pages || data.data || []; setPages(list); if (list[0]) setPageId(list[0].id); }
    })();
  }, []);

  const mediaType = file ? (file.type.startsWith('video/') ? 'video' : file.type.startsWith('image/') ? 'photo' : 'text') : 'text';

  async function createPost(status: 'draft' | 'scheduled') {
    setLoading(true); setError(''); setSuccess('');
    try {
      const body: Record<string, unknown> = { page_id: pageId, content: message.trim(), media_type: mediaType, status };
      if (status === 'scheduled') body.scheduled_for = new Date(scheduledAt).toISOString();
      const res = await fetch('/api/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || 'Request failed.');
      return data.post?.id as string | undefined;
    } catch (err) { setError(err instanceof Error ? err.message : 'Something went wrong.'); return undefined; }
    finally { setLoading(false); }
  }

  async function saveDraft() {
    const id = await createPost('draft');
    if (id) setSuccess('Draft saved.');
  }
  async function schedule() {
    if (!scheduledAt) { setError('Choose a future date and time to schedule.'); return; }
    if (new Date(scheduledAt) <= new Date()) { setError('Scheduled time must be in the future.'); return; }
    const id = await createPost('scheduled');
    if (id) setSuccess('Post scheduled. It will publish via the background worker even if you close the browser.');
  }
  async function publishNow() {
    setLoading(true); setError(''); setSuccess('');
    try {
      const id = await createPost('draft');
      if (!id) return;
      const res = await fetch('/api/posts/publish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ post_id: id }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || 'Publishing failed.');
      setSuccess('Post published to Facebook.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Publishing failed.'); }
    finally { setLoading(false); }
  }

  const pageName = pages.find((p) => p.id === pageId)?.page_name || pages.find((p) => p.id === pageId)?.name || 'Your Page';

  return (
    <div>
      <Header title="Content Studio" subtitle="Create, preview and publish posts" />
      <div className="grid gap-6 px-4 py-6 sm:px-6 lg:grid-cols-2 lg:px-8">
        <Card glass>
          <h2 className="font-semibold">Create Post</h2>
          <form className="mt-4 space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div><label className="label" htmlFor="page">Facebook Page</label>
              <select id="page" className="input-field" value={pageId} onChange={(e) => setPageId(e.target.value)}>
                {pages.length === 0 && <option value="">No Pages connected</option>}
                {pages.map((p) => <option key={p.id} value={p.id}>{p.page_name || p.name}</option>)}
              </select>
            </div>
            <div><label className="label" htmlFor="message">Post text</label><textarea id="message" rows={5} className="input-field" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write your post…" /></div>
            <div><label className="label" htmlFor="media">Photo or video</label><input id="media" type="file" accept="image/*,video/*" className="input-field" onChange={(e) => setFile(e.target.files?.[0] || null)} /><p className="mt-1 text-xs text-slate-400">{file ? `Selected: ${file.name} (${mediaType})` : 'Optional — only formats supported by the approved Meta API permissions can be published.'}</p></div>
            <Input label="Schedule for (optional)" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && <p className="text-sm text-emerald-600">{success}</p>}
            <div className="flex flex-wrap gap-2">
              <Button loading={loading} disabled={!message.trim() || !pageId} onClick={saveDraft}>Save Draft</Button>
              <Button loading={loading} disabled={!message.trim() || !pageId} onClick={publishNow}>Publish Now</Button>
              <Button variant="secondary" loading={loading} disabled={!message.trim() || !pageId || !scheduledAt} onClick={schedule}>Schedule</Button>
            </div>
          </form>
        </Card>
        <Card>
          <h2 className="font-semibold">Preview</h2>
          {message || file ? (
            <div className="mt-4 rounded-2xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900">{pageName}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{message || 'Your post text will appear here.'}</p>
              {file && <p className="mt-3 rounded-xl bg-violet-50 px-3 py-2 text-xs text-violet-700">Attachment: {file.name} ({file.type || 'file'})</p>}
              {scheduledAt && <p className="mt-2 text-xs text-slate-400">Scheduled for: {scheduledAt}</p>}
            </div>
          ) : (
            <p className="mt-4 rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">Write a post to see a live preview here.</p>
          )}
          <p className="mt-4 text-xs text-slate-400">Only publishing formats supported by the approved Meta API permissions and current API version are available.</p>
        </Card>
      </div>
    </div>
  );
}
