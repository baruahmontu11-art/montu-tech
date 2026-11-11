'use client';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

type UserRow = { id: string; email?: string; full_name?: string; is_admin?: boolean; is_suspended?: boolean; created_at?: string };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  async function load() {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to load users.');
      setUsers(data.users || data.data || []);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load users.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function setSuspended(id: string, is_suspended: boolean) {
    setBusyId(id); setError('');
    try {
      const res = await fetch('/api/admin/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: id, is_suspended }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to update user.');
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to update user.'); }
    finally { setBusyId(''); }
  }

  return (
    <div>
      <Header title="User Management" subtitle="Registered users — suspend or activate accounts" />
      <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {loading ? <p className="text-sm text-slate-500">Loading users…</p> : users.length === 0 ? (
          <Card><p className="text-center text-sm text-slate-500">No users found.</p></Card>
        ) : (
          <Card>
            <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm">
              <thead><tr className="text-slate-500"><th className="pb-3 font-medium">User</th><th className="pb-3 font-medium">Role</th><th className="pb-3 font-medium">Status</th><th className="pb-3 font-medium">Actions</th></tr></thead>
              <tbody>{users.map((u) => (
                <tr key={u.id} className="border-t border-slate-100">
                  <td className="py-3"><span className="block font-medium">{u.full_name || u.email}</span><span className="text-xs text-slate-400">{u.email}</span></td>
                  <td className="py-3">{u.is_admin ? <Badge tone="violet">Admin</Badge> : 'User'}</td>
                  <td className="py-3"><Badge tone={u.is_suspended ? 'red' : 'green'}>{u.is_suspended ? 'Suspended' : 'Active'}</Badge></td>
                  <td className="py-3">{u.is_suspended
                    ? <Button loading={busyId === u.id} onClick={() => setSuspended(u.id, false)} className="!px-3 !py-1.5 text-xs">Activate</Button>
                    : <Button variant="danger" loading={busyId === u.id} onClick={() => setSuspended(u.id, true)} className="!px-3 !py-1.5 text-xs">Suspend</Button>}</td>
                </tr>
              ))}</tbody>
            </table></div>
          </Card>
        )}
      </div>
    </div>
  );
}
