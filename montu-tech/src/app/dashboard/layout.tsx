import Sidebar from '@/components/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-white">
      <div className="hidden lg:block"><Sidebar /></div>
      <div className="flex min-h-screen flex-1 flex-col">
        <div className="border-b border-slate-200 bg-slate-100 px-4 py-3 lg:hidden">
          <div className="flex flex-wrap gap-2 text-sm font-medium text-slate-600">
            <a href="/dashboard" className="hover:text-violet-700">Overview</a>
            <a href="/dashboard/pages" className="hover:text-violet-700">Pages</a>
            <a href="/dashboard/studio" className="hover:text-violet-700">Studio</a>
            <a href="/dashboard/scheduler" className="hover:text-violet-700">Scheduler</a>
            <a href="/dashboard/analytics" className="hover:text-violet-700">Analytics</a>
            <a href="/dashboard/comments" className="hover:text-violet-700">Comments</a>
            <a href="/dashboard/monetization" className="hover:text-violet-700">Monetization</a>
            <a href="/dashboard/payout" className="hover:text-violet-700">Payout</a>
            <a href="/dashboard/support" className="hover:text-violet-700">Support</a>
            <a href="/dashboard/settings" className="hover:text-violet-700">Settings</a>
          </div>
        </div>
        <main className="flex-1 bg-white">{children}</main>
      </div>
    </div>
  );
}
