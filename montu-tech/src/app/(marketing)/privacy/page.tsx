export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-bold">Privacy Policy</h1>
      <p className="mt-2 text-sm text-slate-500">Last updated: November 2026</p>
      <div className="mt-6 space-y-5 text-slate-600">
        <p>Montu Tech collects only the information needed to run your account: your name, email address, and the Facebook Page information you explicitly authorise through Meta Facebook Login (Page name and Page ID).</p>
        <p>We never collect your Facebook password. Facebook access tokens are stored encrypted on the server and are never exposed to frontend code.</p>
        <p>We use your data only to provide the service — Page management, publishing, scheduling, analytics and support. We do not sell your personal data.</p>
        <p>You may request deletion of your data at any time from your dashboard or by following the instructions on the Data Deletion page.</p>
        <p>For questions about this policy, contact us via the Contact page.</p>
      </div>
    </div>
  );
}
