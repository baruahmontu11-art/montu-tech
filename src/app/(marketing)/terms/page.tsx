export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-bold">Terms of Service</h1>
      <p className="mt-2 text-sm text-slate-500">Last updated: November 2026</p>
      <div className="mt-6 space-y-5 text-slate-600">
        <p>By using Montu Tech you agree to use the service lawfully and in line with Meta&apos;s Platform Terms and Community Standards.</p>
        <p>You are responsible for the content you publish through Montu Tech and for keeping your account credentials secure.</p>
        <p>Montu Tech uses only the official Meta Facebook Graph API. Payout assistance is a support and request-management workflow; Meta does not offer a public API to directly modify bank details, payout ownership, DOB or tax details, and Montu Tech does not claim otherwise.</p>
        <p>Subscriptions are billed per the plan you choose. You may upgrade, downgrade or cancel from your dashboard; billing history is available there.</p>
        <p>We may suspend accounts that abuse the service, violate these terms, or attempt to grant themselves administrative privileges.</p>
      </div>
    </div>
  );
}
