import Link from 'next/link';
import Logo from '@/components/Logo';

const NAV = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/tickets', label: 'Support Tickets' },
  { href: '/admin/payout-requests', label: 'Payout Requests' },
  { href: '/admin/subscriptions', label: 'Subscriptions' },
  { href: '/admin/audit-logs', label: 'Audit Logs' },
  { href: '/admin/settings', label: 'Settings' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-white">
      <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-100 p-4">
        <div className="px-1 pb-6"><Logo href="/admin" /></div>
        <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Admin</p>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((n) => <Link key={n.href} href={n.href} className="sidebar-link">{n.label}</Link>)}
        </nav>
        <Link href="/dashboard" className="sidebar-link mt-4">← Back to User Dashboard</Link>
      </aside>
      <main className="flex-1">{children}</main>
    </div>
  );
}
