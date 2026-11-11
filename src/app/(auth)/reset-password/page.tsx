'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) { setError(err.message); setLoading(false); return; }
    setSuccess('Password updated. Redirecting to log in…');
    setTimeout(() => router.push('/login'), 1500);
  }

  return (
    <Card glass>
      <h1 className="text-2xl font-bold">Reset password</h1>
      <p className="mt-1 text-sm text-slate-500">Choose a new password for your account.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <Input label="New password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        <Input label="Confirm new password" type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-emerald-600">{success}</p>}
        <Button type="submit" loading={loading} className="w-full">Update Password</Button>
      </form>
    </Card>
  );
}
