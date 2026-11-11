import React from 'react';

export default function Card({ children, className = '', glass = false }: { children: React.ReactNode; className?: string; glass?: boolean }) {
  return <div className={`${glass ? 'glass-card' : 'card'} p-5 sm:p-6 ${className}`}>{children}</div>;
}
export function CardTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-semibold text-slate-900">{children}</h3>;
}
