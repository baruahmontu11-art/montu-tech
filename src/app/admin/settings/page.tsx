'use client';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Card from '@/components/ui/Card';

type Config = Record<string, string | boolean>;
type Announcement = { id: string; title: string; body: string; is_active: boolean; created_at: string };

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [config, setConfig] = useState<Config>({});
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to load settings.');
      setSettings(data.settings ?? {});
      setConfig(data.config ?? {});
      setAnnouncements(data.announcements ?? []);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load settings.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(''); setError('');
    const payload: Record<string, unknown> = { settings };
    if (title.trim()) payload.announcement = { title: title.trim(), body: body.trim(), is_active: true };
    const res = await fetch('/api/admin/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setError(data.error || 'Failed to save settings.'); return; }
    setNotice('Settings saved.');
    setTitle(''); setBody('');
    load();
  };

  return (
    <div>
      <Header title="Admin Settings" subtitle="Website settings, announcements and API configuration status" />
      <div className="max-w-2xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {notice && <p className="rounded-xl bg-green-50 p-3 text-sm text-green-700">{notice}</p>}
        {loading ? <p className="text-sm text-slate-500">Loading settings…</p> : (
          <form onSubmit={save} className="space-y-6">
            <Card glass>
              <h2 className="font-semibold">Website Settings</h2>
              <label className="mt-3 block text-sm font-medium">Site name</label>
              <input className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" value={settings.site_name ?? ''} onChange={(e) => setSettings({ ...settings, site_name: e.target.value })} />
              <label className="mt-3 block text-sm font-medium">Tagline</label>
              <input className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" value={settings.site_tagline ?? ''} onChange={(e) => setSettings({ ...settings, site_tagline: e.target.value })} />
              <label className="mt-3 block text-sm font-medium">Support email</label>
              <input className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" value={settings.support_email ?? ''} onChange={(e) => setSettings({ ...settings, support_email: e.target.value })} />
            </Card>
            <Card>
              <h2 className="font-semibold">New Announcement</h2>
              <input className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Announcement title" value={title} onChange={(e) => setTitle(e.target.value)} />
              <textarea className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" rows={3} placeholder="Announcement message" value={body} onChange={(e) => setBody(e.target.value)} />
              {announcements.length > 0 && (
                <div className="mt-3 space-y-2">
                  {announcements.slice(0, 5).map((a) => (
                    <div key={a.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                      <p className="font-medium">{a.title} {a.is_active ? '' : '(inactive)'}</p>
                      <p className="text-slate-500">{a.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
            <button type="submit" className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700">Save Settings</button>
          </form>
        )}
        <Card>
          <h2 className="font-semibold">API Configuration Status</h2>
          <div className="mt-2 space-y-1 text-sm text-slate-600">
            {Object.entries(config).map(([k, v]) => (
              <p key={k}>{k.replaceAll('_', ' ')}: <strong>{String(v)}</strong></p>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-400">Facebook OAuth, token encryption and webhook verification are server-side only. App secrets and service-role keys are never shown in the frontend.</p>
        </Card>
        <Card>
          <h2 className="font-semibold">Admin Access</h2>
          <p className="mt-2 text-sm text-slate-600">Admin privileges are granted server-side only. Users cannot grant themselves admin access from this interface.</p>
        </Card>
      </div>
    </div>
  );
}
