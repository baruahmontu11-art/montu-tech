'use client';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

type Ticket = { id: string; subject?: string; status?: string; category?: string; created_at?: string };

export default function SupportPage() {
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('general');
  const [message, setMessage] = useState('');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function load() {
    try {
      const res = await fetch('/api/support');
      const data = await res.json().catch(() => ({}));
      if (res.ok) setTickets(data.tickets || data.data || []);
    } catch { /* best-effort */ }
  }
  useEffect(() => { load(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError(''); setSuccess('');
    try {
      const res = await fetch('/api/support', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject, category, message }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to create ticket.');
      setSuccess('Support ticket created.'); setSubject(''); setMessage(''); await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to create ticket.'); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <Header title="Support" subtitle="Tickets and help requests" />
      <div className="grid gap-6 px-4 py-6 sm:px-6 lg:grid-cols-2 lg:px-8">
        <Card glass>
          <h2 className="font-semibold">New Support Ticket</h2>
          <form onSubmit={submit} className="mt-4 space-y-4">
            <div><label className="label" htmlFor="subject">Subject</label><input id="subject" required minLength={3} className="input-field" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="What do you need help with?" /></div>
            <div><label className="label" htmlFor="category">Category</label><select id="category" className="input-field" value={category} onChange={(e) => setCategory(e.target.value)}>{['general', 'payout', 'technical', 'billing', 'other'].map((c) => <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>)}</select></div>
            <div><label className="label" htmlFor="message">Message (at least 10 characters)</label><textarea id="message" rows={5} required minLength={10} className="input-field" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe your issue…" /></div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && <p className="text-sm text-emerald-600">{success}</p>}
            <Button type="submit" loading={loading} className="w-full">Create Ticket</Button>
          </form>
        </Card>
        <Card>
          <h2 className="font-semibold">Ticket History</h2>
          {tickets.length === 0 ? <p className="mt-4 rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">No tickets yet.</p> : (
            <ul className="mt-4 space-y-3">{tickets.map((t) => (
              <li key={t.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"><span><span className="block text-sm font-medium">{t.subject || 'Ticket'}</span><span className="text-xs text-slate-400">{t.category || ''} {t.created_at ? `· ${t.created_at}` : ''}</span></span><Badge tone={t.status === 'completed' ? 'green' : 'amber'}>{t.status || 'pending'}</Badge></li>
            ))}</ul>
          )}
        </Card>
      </div>
    </div>
  );
}
