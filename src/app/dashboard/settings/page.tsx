'use client';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { supabase } from '@/lib/supabase/client';

export default function SettingsPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) { setEmail(data.user.email || ''); setName((data.user.user_metadata?.full_name as string) || ''); }
    })();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError(''); setSuccess('');
    const { error: err } = await supabase.auth.updateUser({ data: { full_name: name } });
    if (err) { setError(err.message); setLoading(false); return; }
    setSuccess('Profile updated.'); setLoading(false);
  }

  return (
    <div>
      <Header title="Settings" subtitle="Your profile and account" />
      <div className="max-w-2xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <Card glass>
          <h2 className="font-semibold">Profile</h2>
          <form onSubmit={save} className="mt-4 space-y-4">
            <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Email" type="email" value={email} disabled />
            <p className="text-xs text-slate-400">Email changes and password changes are handled through Supabase Auth verification emails.</p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && <p className="text-sm text-emerald-600">{success}</p>}
            <Button type="submit" loading={loading}>Save Profile</Button>
          </form>
        </Card>
        <Card>
          <h2 className="font-semibold">Data & Privacy</h2>
          <p className="mt-2 text-sm text-slate-600">You can request deletion of your Montu Tech data and revoke Facebook access at any time. See the Data Deletion page for instructions.</p>
          <a href="/data-deletion" className="btn-secondary mt-4">Data Deletion Instructions</a>
        </Card>
      </div>
    </div>
  );
}
