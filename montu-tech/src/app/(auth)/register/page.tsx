'use client';
import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError(''); setSuccess('');
    const { error: err } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
    if (err) { setError(err.message); setLoading(false); return; }
    setSuccess('Account created. Please check your email to verify your address, then log in.');
    setLoading(false);
  }

  return (
    <Card glass>
      <h1 className="text-2xl font-bold">Create your account</h1>
      <p className="mt-1 text-sm text-slate-500">Start free — no card required.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <Input label="Full name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Montu Baruah" />
        <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        <Input label="Password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-emerald-600">{success}</p>}
        <Button type="submit" loading={loading} className="w-full">Create Account</Button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-500">Already have an account? <Link href="/login" className="text-violet-700 hover:underline">Log in</Link></p>
    </Card>
  );
}
