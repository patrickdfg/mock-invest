'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import { api } from '@/lib/fetcher';
import { won, pct, toneClass } from '@/lib/format';
import { Spinner, Empty } from '@/components/ui';

type Row = {
  rank: number; userId: string; name: string; totalValue: number; seedCash: number;
  pnl: number; pnlPct: number; holdingCount: number; topHolding: string | null; tradeCount: number;
};
type Snap = { userId: string; date: string; totalValue: number; user: { name: string } };

const COLORS = ['#3182f6', '#f04452', '#f5a623', '#2ecc71', '#9b59b6',
                '#1abc9c', '#e67e22', '#e84393', '#00b894', '#636e72'];

const MEDAL = ['🥇', '🥈', '🥉'];

export default function RankingPage() {
  const [data, setData] = useState<{ me: string; rows: Row[]; snapshots: Snap[] } | null>(null);

  useEffect(() => {
    const load = () => api('/api/ranking').then(setData).catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);

  // 스냅샷을 날짜별 행으로 피벗 (참가자별 라인 차트용)
  const chart = useMemo(() => {
    if (!data) return { rows: [], names: [] as string[] };
    const names = [...new Set(data.snapshots.map((s) => s.user.name))].slice(0, 10);
    const byDate = new Map<string, any>();
    for (const s of data.snapshots) {
      if (!names.includes(s.user.name)) continue;
      const row = byDate.get(s.date) ?? { date: s.date };
      row[s.user.name] = Math.round(s.totalValue);
      byDate.set(s.date, row);
    }
    return { rows: [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)), names };
  }, [data]);

  if (!data) return <Spinner />;

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <h1 className="text-xl font-bold">랭킹</h1>
        <span className="text-xs text-muted">수익률 기준 · 1분마다 갱신</span>
      </div>

      {/* 시상대 */}
      <div className="grid grid-cols-3 gap-3">
        {data.rows.slice(0, 3).map((r, i) => (
          <div
            key={r.userId}
            className={`card text-center ${r.userId === data.me ? '!border-brand' : ''}`}
          >
            <div className="text-2xl">{MEDAL[i]}</div>
            <div className="mt-1 truncate font-bold">{r.name}</div>
            <div className={`mt-1 text-sm font-semibold tabular-nums ${toneClass(r.pnlPct)}`}>
              {pct(r.pnlPct)}
            </div>
            <div className="text-xs text-muted tabular-nums">{won(r.totalValue)}원</div>
          </div>
        ))}
      </div>

      {/* 자산 추이 */}
      <section className="card">
        <h2 className="mb-3 font-semibold">참가자 자산 추이</h2>
        {chart.rows.length < 2 ? (
          <Empty>데이터가 하루치 이상 쌓이면 그래프가 표시됩니다</Empty>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart.rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#252d3d" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: '#8b95a7', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={30} />
                <YAxis tick={{ fill: '#8b95a7', fontSize: 11 }} axisLine={false} tickLine={false} width={70} tickFormatter={(v) => won(v)} />
                <Tooltip
                  contentStyle={{ background: '#1b2230', border: '1px solid #252d3d', borderRadius: 12, fontSize: 12 }}
                  formatter={(v: any) => `${won(v)}원`}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {chart.names.map((n, i) => (
                  <Line key={n} type="monotone" dataKey={n} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* 전체 순위표 */}
      <section className="card">
        <h2 className="mb-3 font-semibold">전체 순위</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-line">
                <th className="th w-12">순위</th>
                <th className="th">이름</th>
                <th className="th text-right">총 자산</th>
                <th className="th text-right">손익</th>
                <th className="th text-right">수익률</th>
                <th className="th text-right">보유</th>
                <th className="th text-right">거래</th>
                <th className="th">최대 보유종목</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr
                  key={r.userId}
                  className={`border-b border-line/50 last:border-0 ${
                    r.userId === data.me ? 'bg-brand/10' : 'hover:bg-panel2/50'
                  }`}
                >
                  <td className="td font-bold">{MEDAL[r.rank - 1] ?? r.rank}</td>
                  <td className="td font-medium">
                    {r.name}
                    {r.userId === data.me && <span className="ml-1.5 chip">나</span>}
                  </td>
                  <td className="td text-right">{won(r.totalValue)}원</td>
                  <td className={`td text-right ${toneClass(r.pnl)}`}>
                    {r.pnl >= 0 ? '+' : ''}{won(Math.round(r.pnl))}
                  </td>
                  <td className={`td text-right font-bold ${toneClass(r.pnlPct)}`}>{pct(r.pnlPct)}</td>
                  <td className="td text-right text-muted">{r.holdingCount}</td>
                  <td className="td text-right text-muted">{r.tradeCount}</td>
                  <td className="td text-muted">{r.topHolding ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
