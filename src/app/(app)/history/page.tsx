'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/fetcher';
import { won, pct, toneClass, kstTimeString } from '@/lib/format';
import { Spinner, Empty } from '@/components/ui';

type Order = {
  id: string; symbol: string; name: string; side: string; type: string; status: string;
  quantity: number; limitPrice: number | null; filledPrice: number | null;
  amount: number; fee: number; tax: number; realizedPnl: number | null;
  memo: string | null; createdAt: string; filledAt: string | null;
};

const TABS = [
  { key: '', label: '전체' },
  { key: 'FILLED', label: '체결' },
  { key: 'PENDING', label: '미체결' },
  { key: 'CANCELED', label: '취소' },
];

const STATUS_LABEL: Record<string, string> = {
  FILLED: '체결', PENDING: '대기', CANCELED: '취소',
};

export default function HistoryPage() {
  const [tab, setTab] = useState('');
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    setOrders(null);
    api<{ orders: Order[] }>(`/api/orders${tab ? `?status=${tab}` : ''}`)
      .then((r) => setOrders(r.orders))
      .catch(() => setOrders([]));
  }, [tab]);

  const filled = (orders ?? []).filter((o) => o.status === 'FILLED');
  const realized = filled.reduce((a, o) => a + (o.realizedPnl ?? 0), 0);
  const costs = filled.reduce((a, o) => a + o.fee + o.tax, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">거래내역</h1>
        <div className="flex gap-1 rounded-xl bg-panel2 p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                tab === t.key ? 'bg-panel text-white' : 'text-muted hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="card !p-4">
          <div className="text-xs text-muted">체결 건수</div>
          <div className="mt-1 text-lg font-bold tabular-nums">{filled.length}건</div>
        </div>
        <div className="card !p-4">
          <div className="text-xs text-muted">누적 실현손익</div>
          <div className={`mt-1 text-lg font-bold tabular-nums ${toneClass(realized)}`}>
            {realized >= 0 ? '+' : ''}{won(Math.round(realized))}원
          </div>
        </div>
        <div className="card !p-4">
          <div className="text-xs text-muted">누적 수수료·세금</div>
          <div className="mt-1 text-lg font-bold tabular-nums text-muted">{won(costs)}원</div>
        </div>
      </div>

      <section className="card">
        {!orders ? (
          <Spinner />
        ) : orders.length === 0 ? (
          <Empty>거래 기록이 없습니다</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="border-b border-line">
                  <th className="th">주문시각</th>
                  <th className="th">종목</th>
                  <th className="th">구분</th>
                  <th className="th text-right">수량</th>
                  <th className="th text-right">단가</th>
                  <th className="th text-right">거래대금</th>
                  <th className="th text-right">수수료+세금</th>
                  <th className="th text-right">실현손익</th>
                  <th className="th text-right">상태</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-line/50 last:border-0 hover:bg-panel2/50">
                    <td className="td text-muted">{kstTimeString(new Date(o.createdAt))}</td>
                    <td className="td">
                      <div className="font-medium">{o.name}</div>
                      <div className="text-xs text-muted">
                        {o.type === 'MARKET' ? '시장가' : `지정가 ${won(o.limitPrice ?? 0)}`}
                      </div>
                    </td>
                    <td className={`td font-semibold ${o.side === 'BUY' ? 'text-up' : 'text-down'}`}>
                      {o.side === 'BUY' ? '매수' : '매도'}
                    </td>
                    <td className="td text-right">{won(o.quantity, 4)}</td>
                    <td className="td text-right">{o.filledPrice ? won(o.filledPrice) : '-'}</td>
                    <td className="td text-right">{o.amount ? won(o.amount) : '-'}</td>
                    <td className="td text-right text-muted">{won(o.fee + o.tax)}</td>
                    <td className={`td text-right font-medium ${toneClass(o.realizedPnl ?? 0)}`}>
                      {o.realizedPnl == null
                        ? '-'
                        : `${o.realizedPnl >= 0 ? '+' : ''}${won(Math.round(o.realizedPnl))}`}
                    </td>
                    <td className="td text-right">
                      <span className="chip">{STATUS_LABEL[o.status] ?? o.status}</span>
                      {o.memo && <div className="mt-0.5 text-[11px] text-muted">{o.memo}</div>}
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
