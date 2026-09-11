'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api, del } from '@/lib/fetcher';
import { won, pct, toneClass } from '@/lib/format';
import { Stat, Spinner, Empty } from '@/components/ui';
import type { Portfolio } from '@/lib/trade';

type WatchItem = {
  symbol: string;
  name: string;
  quote: { price: number; changePct: number } | null;
};

export default function Dashboard() {
  const [pf, setPf] = useState<Portfolio | null>(null);
  const [watch, setWatch] = useState<WatchItem[]>([]);
  const [rank, setRank] = useState<{ rank: number; total: number } | null>(null);
  const [updatedAt, setUpdatedAt] = useState('');

  const load = useCallback(async () => {
    const [p, w, r] = await Promise.all([
      api<Portfolio>('/api/portfolio'),
      api<{ items: WatchItem[] }>('/api/watchlist').catch(() => ({ items: [] })),
      api<{ me: string; rows: { userId: string; rank: number }[] }>('/api/ranking').catch(
        () => null
      ),
    ]);
    setPf(p);
    setWatch(w.items);
    if (r) {
      const mine = r.rows.find((x) => x.userId === r.me);
      if (mine) setRank({ rank: mine.rank, total: r.rows.length });
    }
    setUpdatedAt(new Date().toLocaleTimeString('ko-KR'));
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000); // 30초마다 자동 갱신
    return () => clearInterval(t);
  }, [load]);

  if (!pf) return <Spinner />;

  const dayPct = pf.totalValue - pf.dayPnl > 0 ? (pf.dayPnl / (pf.totalValue - pf.dayPnl)) * 100 : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <h1 className="text-xl font-bold">내 계좌</h1>
        <span className="text-xs text-muted">{updatedAt} 기준 · 30초마다 갱신</span>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="총 자산"
          value={`${won(pf.totalValue)}원`}
          sub={`${pf.totalPnl >= 0 ? '+' : ''}${won(Math.round(pf.totalPnl))}원 (${pct(pf.totalPnlPct)})`}
          tone={pf.totalPnl}
        />
        <Stat label="예수금" value={`${won(pf.cash)}원`} sub="주문 가능 금액" />
        <Stat
          label="평가금액"
          value={`${won(pf.stockValue)}원`}
          sub={`보유 ${pf.rows.length}종목`}
        />
        <Stat
          label="오늘 손익"
          value={`${pf.dayPnl >= 0 ? '+' : ''}${won(Math.round(pf.dayPnl))}원`}
          sub={rank ? `전체 ${rank.total}명 중 ${rank.rank}위` : pct(dayPct)}
          tone={pf.dayPnl}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <section className="card lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">보유 종목</h2>
            <Link href="/portfolio" className="text-xs text-brand hover:underline">
              전체 보기
            </Link>
          </div>

          {pf.rows.length === 0 ? (
            <Empty>
              아직 보유 종목이 없어요.{' '}
              <Link href="/trade" className="text-brand hover:underline">
                첫 주식 사러 가기
              </Link>
            </Empty>
          ) : (
            <div className="-mx-2 overflow-x-auto">
              <table className="w-full min-w-[440px]">
                <thead>
                  <tr className="border-b border-line">
                    <th className="th">종목</th>
                    <th className="th text-right">평가금액</th>
                    <th className="th text-right">수익률</th>
                  </tr>
                </thead>
                <tbody>
                  {pf.rows.slice(0, 6).map((r) => (
                    <tr key={r.symbol} className="border-b border-line/50 last:border-0">
                      <td className="td">
                        <Link href={`/trade?symbol=${r.symbol}`} className="hover:underline">
                          <div className="font-medium">{r.name}</div>
                          <div className="text-xs text-muted">
                            {won(r.quantity, 4)}주 · 평단 {won(r.avgPrice)}
                          </div>
                        </Link>
                      </td>
                      <td className="td text-right">{won(r.value)}원</td>
                      <td className={`td text-right font-medium ${toneClass(r.pnl)}`}>
                        <div>{pct(r.pnlPct)}</div>
                        <div className="text-xs">
                          {r.pnl >= 0 ? '+' : ''}
                          {won(Math.round(r.pnl))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">관심 종목</h2>
            <Link href="/trade" className="text-xs text-brand hover:underline">
              추가
            </Link>
          </div>

          {watch.length === 0 ? (
            <Empty>거래 화면에서 ☆ 를 눌러 추가하세요</Empty>
          ) : (
            <ul className="space-y-1">
              {watch.map((w) => (
                <li key={w.symbol} className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-panel2">
                  <Link href={`/trade?symbol=${w.symbol}`} className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{w.name}</div>
                    <div className="text-[11px] text-muted">{w.symbol}</div>
                  </Link>
                  {w.quote ? (
                    <div className="text-right">
                      <div className="text-sm tabular-nums">{won(w.quote.price)}</div>
                      <div className={`text-xs tabular-nums ${toneClass(w.quote.changePct)}`}>
                        {pct(w.quote.changePct)}
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-muted">-</span>
                  )}
                  <button
                    onClick={async () => {
                      await del(`/api/watchlist?symbol=${encodeURIComponent(w.symbol)}`);
                      setWatch(watch.filter((x) => x.symbol !== w.symbol));
                    }}
                    className="text-muted hover:text-up"
                    aria-label="삭제"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
