export default function Badge({ children, tone = 'grey' }: { children: React.ReactNode; tone?: 'grey' | 'green' | 'violet' | 'amber' | 'red' | 'blue' }) {
  const tones: Record<string, string> = {
    grey: 'bg-slate-100 text-slate-700',
    green: 'bg-emerald-100 text-emerald-700',
    violet: 'bg-violet-100 text-violet-700',
    amber: 'bg-amber-100 text-amber-800',
    red: 'bg-red-100 text-red-700',
    blue: 'bg-blue-100 text-blue-700',
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}
