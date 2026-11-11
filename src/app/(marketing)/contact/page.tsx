'use client';
import { useState } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError(''); setSuccess('');
    try {
      const res = await fetch('/api/support', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject: `Contact: ${form.name}`, category: 'general', message: `From ${form.name} <${form.email}>:\n\n${form.message}` }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to send your message.');
      setSuccess('Thank you — your message has been received. We will get back to you by email.');
      setForm({ name: '', email: '', message: '' });
    } catch (err) { setError(err instanceof Error ? err.message : 'Something went wrong.'); }
    finally { setLoading(false); }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-bold">Contact Us</h1>
      <p className="mt-3 text-slate-600">Questions about Montu Tech, pricing or payout assistance? Send us a message.</p>
      <Card className="mt-8">
        <form onSubmit={submit} className="space-y-4">
          <Input label="Your name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <div><label className="label" htmlFor="message">Message</label><textarea id="message" required rows={5} className="input-field" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-emerald-600">{success}</p>}
          <Button type="submit" loading={loading} className="w-full">Send Message</Button>
        </form>
      </Card>
    </div>
  );
}
