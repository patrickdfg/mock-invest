'use client';

import { won, pct, toneClass } from '@/lib/format';

export function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: number;
}) {
  return (
    <div className="card">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1.5 text-2xl font-bold tabular-nums">{value}</div>
      {sub && (
        <div className={`mt-1 text-sm tabular-nums ${tone === undefined ? 'text-muted' : toneClass(tone)}`}>
          {sub}
        </div>
      )}
    </div>
  );
}

export function Money({ value, digits = 0 }: { value: number; digits?: number }) {
  return <span className="tabular-nums">{won(value, digits)}</span>;
}

export function Delta({ amount, percent }: { amount?: number; percent: number }) {
  return (
    <span className={`tabular-nums ${toneClass(percent)}`}>
      {amount !== undefined ? `${amount >= 0 ? '+' : ''}${won(Math.round(amount))} ` : ''}
      ({pct(percent)})
    </span>
  );
}

export function Spinner({ label = '불러오는 중...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-14 text-sm text-muted">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-brand" />
      {label}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="py-14 text-center text-sm text-muted">{children}</div>;
}

export function ErrorBox({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="rounded-xl border border-up/40 bg-up/10 px-3.5 py-2.5 text-sm text-up">
      {message}
    </div>
  );
}
