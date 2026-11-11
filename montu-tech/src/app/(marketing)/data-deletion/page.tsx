import Card from '@/components/ui/Card';

export default function DataDeletionPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-bold">Data Deletion Instructions</h1>
      <p className="mt-3 text-slate-600">If you connected your Facebook account to Montu Tech and want your data deleted, follow these steps.</p>
      <div className="mt-8 space-y-5">
        <Card glass><h2 className="font-semibold">1. Delete from inside Montu Tech (recommended)</h2><p className="mt-2 text-sm text-slate-600">Log in to your Montu Tech account, go to Settings, and use the Delete Account / Delete My Data option. This removes your profile, connected Pages, posts, tickets and payout requests from our database.</p></Card>
        <Card glass><h2 className="font-semibold">2. Remove Montu Tech from Facebook</h2><p className="mt-2 text-sm text-slate-600">In Facebook, go to Settings → Apps and Websites → Active, find Montu Tech and choose Remove. This revokes our access token; any data Facebook shared with us under that token is then deleted on request.</p></Card>
        <Card glass><h2 className="font-semibold">3. Request deletion by email</h2><p className="mt-2 text-sm text-slate-600">If you cannot log in, send a deletion request from the Contact page with the email address you registered with. Include “Data Deletion Request” in your message. We will confirm deletion by email once complete.</p></Card>
        <Card glass><h2 className="font-semibold">What is deleted</h2><p className="mt-2 text-sm text-slate-600">Your profile, Facebook Page connections (names, Page IDs and encrypted tokens), scheduled and published posts, analytics snapshots, support tickets, payout requests and uploaded documents. Backups are purged within 30 days.</p></Card>
      </div>
    </div>
  );
}
