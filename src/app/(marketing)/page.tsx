import Link from 'next/link';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

const FEATURES = [
  { title: 'Page Management', text: 'Connect multiple Facebook Pages, see connection status and manage them from one dashboard.' },
  { title: 'Content Studio', text: 'Create text posts, upload photos and videos, preview, save drafts and publish.' },
  { title: 'Post Scheduler', text: 'Schedule posts in advance. A background worker publishes them even when your browser is closed.' },
  { title: 'Analytics', text: 'Reach, engagement, impressions and followers — only metrics actually returned by the Meta Graph API.' },
  { title: 'Comments Manager', text: 'View permitted comments on your Pages and reply from one place.' },
  { title: 'Payout Assistance', text: 'Raise structured payout support requests — owner-name, DOB, business-type, bank onboarding and source-transfer help.' },
];

const PLANS = [
  { name: 'Free', price: '₹0', text: 'For getting started', features: ['1 Facebook Page', '10 scheduled posts / month', 'Basic analytics', 'Community support'] },
  { name: 'Basic', price: '₹499/mo', text: 'For growing creators', features: ['3 Facebook Pages', '100 scheduled posts / month', 'Analytics & reports', 'Comments manager', 'Email support'] },
  { name: 'Premium', price: '₹999/mo', text: 'For serious creators', features: ['10 Facebook Pages', 'Unlimited scheduled posts', 'Advanced analytics', 'Payout assistance', 'Priority support'], popular: true },
  { name: 'Enterprise', price: 'Custom', text: 'For teams & agencies', features: ['Unlimited Pages', 'Team access & roles', 'Dedicated support', 'Custom limits'] },
];

const FAQS = [
  { q: 'Does Montu Tech store my Facebook password?', a: 'No. We never collect Facebook passwords. You connect Pages through the official Meta Facebook Login (OAuth) flow.' },
  { q: 'Can Montu Tech change my payout bank details directly?', a: 'No. Meta does not offer a public API to directly modify bank details, payout ownership, DOB or tax details. Payout help on Montu Tech works as a documented support and request-management workflow.' },
  { q: 'Will my scheduled posts publish if I close the browser?', a: 'Yes. Scheduled posts are processed by a background worker and job queue on the server.' },
  { q: 'Are the analytics figures live Meta data?', a: 'Yes, where the authorised Meta API returns them. Metrics that are not available under your current permissions are clearly labelled as not available — never fabricated.' },
];

export default function HomePage() {
  return (
    <div>
      <section className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6">
        <Badge tone="violet">All-in-One Facebook Management Platform</Badge>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl">Manage your Facebook Pages, content and payouts — <span className="text-violet-600">in one place.</span></h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">Connect Pages with official Meta login, publish and schedule posts, track real analytics, reply to comments and get structured payout support.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/register" className="btn-primary !px-7 !py-3 text-base">Start Free</Link>
          <Link href="/pricing" className="btn-secondary !px-7 !py-3 text-base">See Pricing</Link>
        </div>
        <div className="glass-card mx-auto mt-12 max-w-4xl p-6 text-left">
          <p className="text-sm font-semibold text-slate-900">Your dashboard at a glance</p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {['Connected Pages', 'Published Posts', 'Scheduled Posts', 'Support Requests'].map((l) => (
              <div key={l} className="rounded-xl bg-violet-50 p-4"><p className="text-2xl font-bold text-violet-700">—</p><p className="text-xs text-slate-500">{l}</p><p className="text-[11px] text-slate-400">Connect Facebook to see live data</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <h2 className="text-center text-3xl font-bold">Everything you need to run your Pages</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => <Card key={f.title} glass><h3 className="font-semibold">{f.title}</h3><p className="mt-2 text-sm text-slate-600">{f.text}</p></Card>)}
        </div>
      </section>

      <section className="bg-violet-50/60 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold">Simple, honest pricing</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((p) => (
              <Card key={p.name} glass={!!p.popular} className={p.popular ? '!border-violet-300 ring-2 ring-violet-200' : ''}>
                {p.popular && <Badge tone="violet">Most Popular</Badge>}
                <h3 className="mt-2 text-lg font-bold">{p.name}</h3>
                <p className="mt-1 text-3xl font-bold text-violet-700">{p.price}</p>
                <p className="text-sm text-slate-500">{p.text}</p>
                <ul className="mt-4 space-y-2 text-sm text-slate-600">{p.features.map((f) => <li key={f}>✓ {f}</li>)}</ul>
                <Link href="/register" className="btn-primary mt-5 w-full">Choose {p.name}</Link>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h2 className="text-center text-3xl font-bold">Frequently asked questions</h2>
        <div className="mt-8 space-y-4">{FAQS.map((f) => <Card key={f.q}><h3 className="font-semibold">{f.q}</h3><p className="mt-2 text-sm text-slate-600">{f.a}</p></Card>)}</div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <h2 className="text-center text-3xl font-bold">Loved by creators</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {[{ n: 'Creator, Assam', t: 'Scheduling posts in advance saves me hours every week.' }, { n: 'Page Admin, Guwahati', t: 'The payout assistance workflow finally keeps my requests organised.' }, { n: 'Small Business Owner', t: 'Clean dashboard, real analytics, no confusing extras.' }].map((x) => (
            <Card key={x.n} glass><p className="text-sm text-slate-600">“{x.t}”</p><p className="mt-3 text-sm font-semibold">{x.n}</p></Card>
          ))}
        </div>
        <div className="mt-12 rounded-3xl bg-violet-600 p-10 text-center text-white">
          <h2 className="text-3xl font-bold">Ready to simplify your Facebook workflow?</h2>
          <p className="mt-2 text-violet-100">Create a free account and connect your first Page.</p>
          <Link href="/register" className="mt-6 inline-block rounded-xl bg-white px-7 py-3 font-semibold text-violet-700">Create Free Account</Link>
        </div>
      </section>
    </div>
  );
}
