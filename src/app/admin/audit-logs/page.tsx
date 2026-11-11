'use client';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Card from '@/components/ui/Card';

type Log = { id: string; action?: string; user_id?: string; resource_type?: string; resource_id?: string; details?: unknown; created_at?: string };

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/audit-logs');
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || data.message || 'Failed to load audit logs.');
        setLogs(data.logs || data.audit_logs || data.data || []);
      } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load audit logs.'); }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <div>
      <Header title="Audit Logs" subtitle="Admin and system actions, newest first" />
      <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {loading ? <p className="text-sm text-slate-500">Loading audit logs…</p> : logs.length === 0 ? (
          <Card><p className="text-center text-sm text-slate-500">No audit log entries yet.</p></Card>
        ) : (
          <Card><ul className="divide-y divide-slate-100">{logs.map((l) => (
            <li key={l.id} className="py-3 text-sm">
              <span className="font-medium">{l.action || 'Action'}</span>
              {l.resource_type && <span className="text-slate-500"> — {l.resource_type}{l.resource_id ? ` ${l.resource_id}` : ''}</span>}
              {l.user_id && <span className="block text-xs text-slate-400">User: {l.user_id}</span>}
              {l.created_at && <span className="block text-xs text-slate-400">{l.created_at}</span>}
              {l.details != null && <span className="block text-xs text-slate-500">{typeof l.details === 'string' ? l.details : JSON.stringify(l.details)}</span>}
            </li>
          ))}</ul></Card>
        )}
      </div>
    </div>
  );
}
