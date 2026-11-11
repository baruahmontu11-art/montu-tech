import Card from '@/components/ui/Card';

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-bold">About Montu Tech</h1>
      <p className="mt-4 text-slate-600">Montu Tech is an all-in-one Facebook management platform built for creators, Page admins and small businesses in India and beyond.</p>
      <p className="mt-3 text-slate-600">Our mission: Simplify Facebook Page Management, Creator Analytics and Payout Support in One Platform.</p>
      <div className="mt-8 grid gap-5 sm:grid-cols-3">
        <Card glass><h2 className="font-semibold">Official API only</h2><p className="mt-2 text-sm text-slate-600">We use only the official Meta Facebook Graph API. We never collect Facebook passwords.</p></Card>
        <Card glass><h2 className="font-semibold">Honest data</h2><p className="mt-2 text-sm text-slate-600">We show only metrics Meta actually returns. Unavailable metrics are labelled, never invented.</p></Card>
        <Card glass><h2 className="font-semibold">Payout help, done properly</h2><p className="mt-2 text-sm text-slate-600">Payout changes are handled as documented support requests — not as unauthorised account changes.</p></Card>
      </div>
    </div>
  );
}
