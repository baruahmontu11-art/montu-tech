import Link from 'next/link';

export default function Logo({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-base font-bold text-white shadow-md shadow-violet-200">MT</span>
      <span className="leading-tight">
        <span className="block text-lg font-bold tracking-tight text-slate-900">MONTU <span className="text-violet-600">TECH</span></span>
        <span className="block text-[11px] font-medium text-slate-500">Facebook Management Platform</span>
      </span>
    </Link>
  );
}
