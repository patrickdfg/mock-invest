'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/fetcher';
import { won, pct, toneClass } from '@/lib/format';
import { Spinner, Empty, Stat } from '@/components/ui';
import type { Portfolio } from '@/lib/trade';

export default function PortfolioPage() {
  const [pf, setPf] = useState<Portfolio | null>(null);

  useEffect(() => {
    const load = () => api<Portfolio>('/api/portfolio').then(setPf).catch(() => {});
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  if (!pf) return <Spinner />;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">내 자산</h1>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="총 자산" value={`${won(pf.totalValue)}원`} />
        <Stat label="투자원금" value={`${won(pf.seedCash)}원`} sub="시작 시드머니" />
        <Stat
          label="총 손익"
          value={`${pf.totalPnl >= 0 ? '+' : ''}${won(Math.round(pf.totalPnl))}원`}
          sub={pct(pf.totalPnlPct)}
          tone={pf.totalPnl}
        />
        <Stat label="예수금" value={`${won(pf.cash)}원`} sub={`주식 ${won(pf.stockValue)}원`} />
      </div>

      <section className="card">
        <h2 className="mb-3 font-semibold">보유 종목 {pf.rows.length}개</h2>
        {pf.rows.length === 0 ? (
          <Empty>
            보유 종목이 없습니다.{' '}
            <Link href="/trade" className="text-brand hover:underline">거래하러 가기</Link>
          </Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="border-b border-line">
                  <th className="th">종목</th>
                  <th className="th text-right">보유수량</th>
                  <th className="th text-right">평균단가</th>
                  <th className="th text-right">현재가</th>
                  <th className="th text-right">매입금액</th>
                  <th className="th text-right">평가금액</th>
                  <th className="th text-right">평가손익</th>
                  <th className="th text-right">비중</th>
                </tr>
              </thead>
              <tbody>
                {pf.rows.map((r) => (
                  <tr key={r.symbol} className="border-b border-line/50 last:border-0 hover:bg-panel2/50">
                    <td className="td">
                      <Link href={`/trade?symbol=${r.symbol}`} className="hover:underline">
                        <div className="font-medium">{r.name}</div>
                        <div className="text-xs text-muted">{r.symbol}</div>
                      </Link>
                    </td>
                    <td className="td text-right">{won(r.quantity, 4)}</td>
                    <td className="td text-right">{won(r.avgPrice)}</td>
                    <td className="td text-right">
                      <div>{won(r.price)}</div>
                      <div className={`text-xs ${toneClass(r.changePct)}`}>{pct(r.changePct)}</div>
                    </td>
                    <td className="td text-right text-muted">{won(r.cost)}</td>
                    <td className="td text-right font-medium">{won(r.value)}</td>
                    <td className={`td text-right font-semibold ${toneClass(r.pnl)}`}>
                      <div>{r.pnl >= 0 ? '+' : ''}{won(Math.round(r.pnl))}</div>
                      <div className="text-xs">{pct(r.pnlPct)}</div>
                    </td>
                    <td className="td text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-1.5 w-14 overflow-hidden rounded-full bg-panel2">
                          <div className="h-full bg-brand" style={{ width: `${Math.min(r.weight, 100)}%` }} />
                        </div>
                        <span className="w-11 text-right text-xs text-muted">{r.weight.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
