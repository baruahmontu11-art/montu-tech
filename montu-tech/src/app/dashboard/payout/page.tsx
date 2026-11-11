'use client';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

const TYPES = [
  { value: 'owner_name', label: 'Payout owner name correction' },
  { value: 'dob', label: 'Date of birth correction' },
  { value: 'business_type', label: 'Business type correction' },
  { value: 'bank_onboarding', label: 'Bank onboarding issue' },
  { value: 'source_transfer', label: 'Payout source transfer' },
];

const STATUS_LABEL: Record<string, string> = { pending: 'Pending', under_review: 'Under Review', in_progress: 'In Progress', waiting_for_information: 'Waiting for Information', completed: 'Completed', rejected: 'Rejected' };

type Req = { id: string; type?: string; status?: string; created_at?: string; requested_value?: string };

export default function PayoutPage() {
  const [type, setType] = useState(TYPES[0].value);
  const [requestedValue, setRequestedValue] = useState('');
  const [reason, setReason] = useState('');
  const [requests, setRequests] = useState<Req[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function load() {
    try {
      const res = await fetch('/api/payout');
      const data = await res.json().catch(() => ({}));
      if (res.ok) setRequests(data.requests || data.payout_requests || data.data || []);
    } catch { /* history is best-effort on load */ }
  }
  useEffect(() => { load(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError(''); setSuccess('');
    try {
      const res = await fetch('/api/payout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, requested_value: requestedValue.trim(), reason: reason.trim() }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to submit payout request.');
      setSuccess('Payout assistance request submitted. You can track its status below.');
      setRequestedValue(''); setReason(''); await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to submit request.'); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <Header title="Payout Assistance" subtitle="Structured payout support requests — reviewed by our team" />
      <div className="grid gap-6 px-4 py-6 sm:px-6 lg:grid-cols-2 lg:px-8">
        <Card glass>
          <h2 className="font-semibold">New Payout Request</h2>
          <p className="mt-1 text-xs text-slate-500">Meta does not offer a public API to directly modify bank details, payout ownership, DOB or tax details. Requests here are support workflows, not direct account changes.</p>
          <form onSubmit={submit} className="mt-4 space-y-4">
            <div><label className="label" htmlFor="ptype">Request type</label><select id="ptype" className="input-field" value={type} onChange={(e) => setType(e.target.value)}>{TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
            <div><label className="label" htmlFor="reqval">Requested (corrected) value</label><input id="reqval" required className="input-field" value={requestedValue} onChange={(e) => setRequestedValue(e.target.value)} placeholder="e.g. the correct owner name" /></div>
            <div><label className="label" htmlFor="reason">Reason (at least 10 characters)</label><textarea id="reason" rows={4} required minLength={10} className="input-field" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Describe the issue and why the correction is needed…" /></div>
            <p className="text-xs text-slate-400">Do not share passwords or OTPs in this form. Supporting documents can be added by the support team on request.</p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && <p className="text-sm text-emerald-600">{success}</p>}
            <Button type="submit" loading={loading} className="w-full">Submit Request</Button>
          </form>
        </Card>
        <Card>
          <h2 className="font-semibold">My Payout Requests</h2>
          {requests.length === 0 ? <p className="mt-4 rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">No payout requests yet.</p> : (
            <ul className="mt-4 space-y-3">{requests.map((r) => (
              <li key={r.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span><span className="block text-sm font-medium">{TYPES.find((t) => t.value === r.type)?.label || r.type || 'Payout request'}</span><span className="text-xs text-slate-400">{r.requested_value || ''} {r.created_at ? `· ${r.created_at}` : ''}</span></span>
                <Badge tone={r.status === 'completed' ? 'green' : r.status === 'rejected' ? 'red' : 'amber'}>{STATUS_LABEL[r.status || ''] || r.status || 'Pending'}</Badge>
              </li>
            ))}</ul>
          )}
          <p className="mt-4 text-xs text-slate-400">Statuses: Pending, Under Review, In Progress, Waiting for Information, Completed, Rejected.</p>
        </Card>
      </div>
    </div>
  );
}
