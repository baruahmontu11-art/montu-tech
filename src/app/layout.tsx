import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Montu Tech — All-in-One Facebook Management Platform',
  description: 'Simplify Facebook Page Management, Creator Analytics and Payout Support in One Platform.',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-slate-900 antialiased">{children}</body>
    </html>
  );
}
