'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from './Logo';

const NAV = [
  { href: '/dashboard', label: 'Overview', icon: '▦' },
  { href: '/dashboard/pages', label: 'Pages', icon: '📄' },
  { href: '/dashboard/studio', label: 'Content Studio', icon: '✎' },
  { href: '/dashboard/scheduler', label: 'Scheduler', icon: '📅' },
  { href: '/dashboard/analytics', label: 'Analytics', icon: '📊' },
  { href: '/dashboard/comments', label: 'Comments', icon: '💬' },
  { href: '/dashboard/monetization', label: 'Monetization', icon: '💰' },
  { href: '/dashboard/payout', label: 'Payout Assistance', icon: '🏦' },
  { href: '/dashboard/support', label: 'Support', icon: '🎧' },
  { href: '/dashboard/settings', label: 'Settings', icon: '⚙️' },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-100 p-4">
      <div className="px-1 pb-6"><Logo href="/dashboard" /></div>
      <nav className="flex flex-1 flex-col gap-1">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className={active ? 'sidebar-link-active' : 'sidebar-link'}>
              <span aria-hidden>{item.icon}</span>{item.label}
            </Link>
          );
        })}
      </nav>
      <div className="glass-card mt-4 p-4">
        <p className="text-sm font-semibold text-slate-900">Need help with payouts?</p>
        <p className="mt-1 text-xs text-slate-500">Raise a payout assistance request and our team will review it.</p>
        <Link href="/dashboard/payout" className="btn-primary mt-3 w-full !px-3 !py-2 text-xs">Open Payout Assistance</Link>
      </div>
      <p className="mt-4 px-1 text-center text-[11px] text-slate-400">MONTU TECH · v1.0</p>
    </aside>
  );
}
