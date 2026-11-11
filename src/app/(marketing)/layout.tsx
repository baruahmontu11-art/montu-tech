import Link from 'next/link';
import Logo from '@/components/Logo';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            <Link href="/features" className="hover:text-violet-700">Features</Link>
            <Link href="/pricing" className="hover:text-violet-700">Pricing</Link>
            <Link href="/about" className="hover:text-violet-700">About</Link>
            <Link href="/contact" className="hover:text-violet-700">Contact</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn-secondary !px-4 !py-2">Log in</Link>
            <Link href="/register" className="btn-primary !px-4 !py-2">Get Started</Link>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          <div><Logo /><p className="mt-3 text-sm text-slate-500">All-in-One Facebook Management Platform. Simplify Facebook Page Management, Creator Analytics and Payout Support in One Platform.</p></div>
          <div><h4 className="font-semibold">Product</h4><ul className="mt-3 space-y-2 text-sm text-slate-600"><li><Link href="/features">Features</Link></li><li><Link href="/pricing">Pricing</Link></li><li><Link href="/dashboard">Dashboard</Link></li></ul></div>
          <div><h4 className="font-semibold">Company</h4><ul className="mt-3 space-y-2 text-sm text-slate-600"><li><Link href="/about">About</Link></li><li><Link href="/contact">Contact</Link></li></ul></div>
          <div><h4 className="font-semibold">Legal</h4><ul className="mt-3 space-y-2 text-sm text-slate-600"><li><Link href="/privacy">Privacy Policy</Link></li><li><Link href="/terms">Terms of Service</Link></li><li><Link href="/data-deletion">Data Deletion</Link></li></ul></div>
        </div>
        <p className="border-t border-slate-200 py-4 text-center text-xs text-slate-400">© 2026 Montu Tech. All rights reserved.</p>
      </footer>
    </div>
  );
}
