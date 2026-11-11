import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Link from 'next/link';

const PLANS = [
  { name: 'Free', price: '₹0', period: 'forever', features: ['1 Facebook Page', '10 scheduled posts / month', 'Basic analytics', 'Community support'], limits: 'Usage limits apply as shown.' },
  { name: 'Basic', price: '₹499', period: '/ month', features: ['3 Facebook Pages', '100 scheduled posts / month', 'Analytics & reports', 'Comments manager', 'Email support'], limits: 'Upgrade or downgrade anytime.' },
  { name: 'Premium', price: '₹999', period: '/ month', features: ['10 Facebook Pages', 'Unlimited scheduled posts', 'Advanced analytics', 'Payout assistance', 'Priority support'], popular: true, limits: 'Most popular for growing creators.' },
  { name: 'Enterprise', price: 'Custom', period: '', features: ['Unlimited Pages', 'Team access & roles', 'Dedicated support', 'Custom limits & billing'], limits: 'Contact us for a tailored plan.' },
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <h1 className="text-center text-4xl font-bold">Pricing</h1>
      <p className="mx-auto mt-3 max-w-xl text-center text-slate-600">Start free. Upgrade when you need more Pages, more scheduled posts and payout assistance. Payments are processed securely via Razorpay with server-side verification.</p>
      <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((p) => (
          <Card key={p.name} glass={!!p.popular} className={p.popular ? '!border-violet-300 ring-2 ring-violet-200' : ''}>
            {p.popular && <Badge tone="violet">Most Popular</Badge>}
            <h2 className="mt-2 text-lg font-bold">{p.name}</h2>
            <p className="mt-1 text-3xl font-bold text-violet-700">{p.price}<span className="text-base font-normal text-slate-500">{p.period}</span></p>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">{p.features.map((f) => <li key={f}>✓ {f}</li>)}</ul>
            <p className="mt-4 text-xs text-slate-400">{p.limits}</p>
            <Link href="/register" className="btn-primary mt-5 w-full">Choose {p.name}</Link>
          </Card>
        ))}
      </div>
      <p className="mt-8 text-center text-sm text-slate-500">Prices in INR. Subscriptions can be upgraded, downgraded or cancelled from your dashboard. Billing history is available under Subscriptions.</p>
    </div>
  );
}
