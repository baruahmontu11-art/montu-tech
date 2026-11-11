import Card from '@/components/ui/Card';
import Link from 'next/link';

const GROUPS = [
  { title: 'Page Management', items: ['Connect multiple Facebook Pages via official Meta OAuth', 'View Page name, Page ID and connection status', 'Token expiry monitoring and reconnect', 'Disconnect a Page at any time'] },
  { title: 'Content Studio & Scheduler', items: ['Text posts, photo and video uploads', 'Live preview before publishing', 'Save drafts', 'Schedule posts with a background worker', 'Retry failed publishing jobs'] },
  { title: 'Analytics & Comments', items: ['Reach, engagement, impressions and followers where returned by Meta', 'Post and video performance', 'Date filters and weekly/monthly reports', 'Reply to permitted comments'] },
  { title: 'Monetization & Payout Support', items: ['Monetization status where supported by Meta', 'No fabricated earnings — only data Meta returns', 'Structured payout assistance requests', 'Request status tracking and admin responses'] },
];

export default function FeaturesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-bold">Features</h1>
      <p className="mt-3 max-w-2xl text-slate-600">Everything in Montu Tech is built on the official Meta Facebook Graph API — no passwords collected, no unauthorised changes, no fabricated data.</p>
      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {GROUPS.map((g) => <Card key={g.title} glass><h2 className="text-lg font-semibold">{g.title}</h2><ul className="mt-3 space-y-2 text-sm text-slate-600">{g.items.map((i) => <li key={i}>✓ {i}</li>)}</ul></Card>)}
      </div>
      <Link href="/register" className="btn-primary mt-10">Try Montu Tech Free</Link>
    </div>
  );
}
