'use client';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

type Ticket = { id: string; subject?: string; status?: string; category?: string; message?: string; admin_response?: string; created_at?: string };

const STATUSES = ['pending', 'under_review', 'in_progress', 'waiting_for_information', 'completed', 'rejected'] as const;
const LABEL: Record<string, string> = { pending: 'Pending', under_review: 'Under Review', in_progress: 'In Progress', waiting_for_information: 'Waiting for Information', completed: 'Completed', rejected: 'Rejected' };

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busyId, setBusyId] = useState('');
  const [response, setResponse] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/admin/tickets');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to load tickets.');
      setTickets(data.tickets || data.data || []);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load tickets.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function updateStatus(id: string, status: string) {
    setBusyId(id); setError(''); setSuccess('');
    try {
      const res = await fetch('/api/admin/tickets', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticket_id: id, status, admin_response: response[id] || undefined }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to update ticket.');
      setSuccess('Ticket status updated.'); await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to update ticket.'); }
    finally { setBusyId(''); }
  }

  return (
    <div>
      <Header title="Support Tickets" subtitle="Review and update ticket status" />
      <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {success && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p>}
        {loading ? <p className="text-sm text-slate-500">Loading tickets…</p> : tickets.length === 0 ? (
          <Card><p className="text-center text-sm text-slate-500">No tickets yet.</p></Card>
        ) : (
          <div className="space-y-4">{tickets.map((t) => (
            <Card key={t.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="font-medium">{t.subject || 'Ticket'}</p><p className="text-xs text-slate-400">{t.category || ''} {t.created_at ? `· ${t.created_at}` : ''}</p>{t.message && <p className="mt-2 text-sm text-slate-600">{t.message}</p>}{t.admin_response && <p className="mt-2 rounded-xl bg-violet-50 px-3 py-2 text-sm text-violet-800">Admin response: {t.admin_response}</p>}</div>
                <Badge tone={t.status === 'completed' ? 'green' : t.status === 'rejected' ? 'red' : 'amber'}>{LABEL[t.status || ''] || t.status || 'Pending'}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input className="input-field min-w-[200px] flex-1" placeholder="Admin response (optional)…" value={response[t.id] || ''} onChange={(e) => setResponse({ ...response, [t.id]: e.target.value })} />
              </div>
              <div className="mt-2 flex flex-wrap gap-2">{STATUSES.map((s) => <Button key={s} variant={t.status === s ? 'primary' : 'secondary'} loading={busyId === t.id} onClick={() => updateStatus(t.id, s)} className="!px-3 !py-1.5 text-xs">{LABEL[s]}</Button>)}</div>
            </Card>
          ))}</div>
        )}
      </div>
    </div>
  );
}
