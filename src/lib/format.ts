export function won(n: number, digits = 0) {
  if (!Number.isFinite(n)) return '-';
  return n.toLocaleString('ko-KR', { maximumFractionDigits: digits });
}

export function pct(n: number, digits = 2) {
  if (!Number.isFinite(n)) return '-';
  const s = n >= 0 ? '+' : '';
  return `${s}${n.toFixed(digits)}%`;
}

export function signed(n: number) {
  if (!Number.isFinite(n)) return '-';
  const s = n > 0 ? '+' : '';
  return s + won(Math.round(n));
}

/** 상승 빨강 / 하락 파랑 (한국식) */
export function toneClass(n: number) {
  if (n > 0) return 'text-up';
  if (n < 0) return 'text-down';
  return 'text-muted';
}

export function kstDateString(d: Date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d); // YYYY-MM-DD
}

export function kstTimeString(d: Date) {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/** 큰 수를 한국식 단위로: 1억 이상 "1.2억", 1만 이상 "984만" */
export function compactKo(n: number) {
  if (!Number.isFinite(n)) return '-';
  if (n >= 1e8) return `${(n / 1e8).toFixed(1).replace(/\.0$/, '')}억`;
  if (n >= 1e4) return `${Math.round(n / 1e4).toLocaleString('ko-KR')}만`;
  return n.toLocaleString('ko-KR');
}
