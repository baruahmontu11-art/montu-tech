'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  const router = useRouter();
  const [error, setError] = useState('');
  async function logout() {
    const { error: err } = await supabase.auth.signOut();
    if (err) { setError(err.message); return; }
    router.push('/login');
    router.refresh();
  }
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3">
          {error && <span className="hidden text-xs text-red-600 sm:inline">{error}</span>}
          <Link href="/dashboard/support" className="btn-secondary !px-3 !py-2 text-xs sm:text-sm">Help</Link>
          <button onClick={logout} className="btn-secondary !px-3 !py-2 text-xs sm:text-sm">Log out</button>
        </div>
      </div>
    </header>
  );
}
