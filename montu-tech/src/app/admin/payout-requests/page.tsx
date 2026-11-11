'use client';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

type Req = { id: string; type?: string; status?: string; created_at?: string; requested_value?: string; reason?: string; admin_response?: string };

const STATUSES = ['pending', 'under_review', 'in_progress', 'waiting_for_information', 'completed', 'rejected'] as const;
const LABEL: Record<string, string> = { pending: 'Pending', under_review: 'Under Review', in_progress: 'In Progress', waiting_for_information: 'Waiting for Information', completed: 'Completed', rejected: 'Rejected' };

export default function AdminPayoutRequestsPage() {
  const [reqs, setReqs] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busyId, setBusyId] = useState('');
  const [response, setResponse] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/admin/payout-requests');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to load payout requests.');
      setReqs(data.requests || data.payout_requests || data.data || []);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load payout requests.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function updateStatus(id: string, status: string) {
    setBusyId(id); setError(''); setSuccess('');
    try {
      const res = await fetch('/api/admin/payout-requests', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ request_id: id, status, admin_response: response[id] || undefined }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to update request.');
      setSuccess('Payout request status updated.'); await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to update request.'); }
    finally { setBusyId(''); }
  }

  return (
    <div>
      <Header title="Payout Assistance Requests" subtitle="Review payout support requests and update status" />
      <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {success && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p>}
        {loading ? <p className="text-sm text-slate-500">Loading payout requests…</p> : reqs.length === 0 ? (
          <Card><p className="text-center text-sm text-slate-500">No payout requests yet.</p></Card>
        ) : (
          <div className="space-y-4">{reqs.map((r) => (
            <Card key={r.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="font-medium">{r.type || 'Payout request'}</p><p className="text-xs text-slate-400">{r.created_at || ''}</p>{r.requested_value && <p className="mt-1 text-sm text-slate-600">Requested value: {r.requested_value}</p>}{r.reason && <p className="mt-1 text-sm text-slate-600">{r.reason}</p>}{r.admin_response && <p className="mt-2 rounded-xl bg-violet-50 px-3 py-2 text-sm text-violet-800">Admin response: {r.admin_response}</p>}</div>
                <Badge tone={r.status === 'completed' ? 'green' : r.status === 'rejected' ? 'red' : 'amber'}>{LABEL[r.status || ''] || r.status || 'Pending'}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input className="input-field min-w-[200px] flex-1" placeholder="Admin response (optional)…" value={response[r.id] || ''} onChange={(e) => setResponse({ ...response, [r.id]: e.target.value })} />
              </div>
              <div className="mt-2 flex flex-wrap gap-2">{STATUSES.map((s) => <Button key={s} variant={r.status === s ? 'primary' : 'secondary'} loading={busyId === r.id} onClick={() => updateStatus(r.id, s)} className="!px-3 !py-1.5 text-xs">{LABEL[s]}</Button>)}</div>
            </Card>
          ))}</div>
        )}
      </div>
    </div>
  );
}
