'use client';

import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { api } from '@/lib/fetcher';
import { won } from '@/lib/format';

const RANGES = [
  { key: '5d', label: '1주' },
  { key: '1mo', label: '1개월' },
  { key: '3mo', label: '3개월' },
  { key: '6mo', label: '6개월' },
  { key: '1y', label: '1년' },
  { key: '5y', label: '5년' },
];

type Candle = { date: string; close: number };

export default function PriceChart({ symbol }: { symbol: string }) {
  const [range, setRange] = useState('3mo');
  const [data, setData] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api<{ candles: Candle[] }>(`/api/history?symbol=${encodeURIComponent(symbol)}&range=${range}`)
      .then((r) => alive && setData(r.candles))
      .catch(() => alive && setData([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [symbol, range]);

  const rising = data.length > 1 && data[data.length - 1].close >= data[0].close;
  const color = rising ? '#f04452' : '#3182f6';

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              range === r.key ? 'bg-panel2 text-white' : 'text-muted hover:text-slate-300'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="h-56 w-full">
        {loading ? (
          <div className="flex h-full items-center justify-center text-xs text-muted">
            차트 불러오는 중...
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-muted">
            차트 데이터를 불러오지 못했습니다
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#252d3d" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: '#8b95a7', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                minTickGap={40}
              />
              <YAxis
                domain={['auto', 'auto']}
                tick={{ fill: '#8b95a7', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={64}
                tickFormatter={(v) => won(v)}
              />
              <Tooltip
                contentStyle={{
                  background: '#1b2230',
                  border: '1px solid #252d3d',
                  borderRadius: 12,
                  fontSize: 12,
                }}
                labelStyle={{ color: '#8b95a7' }}
                formatter={(v: any) => [`${won(v)}원`, '종가']}
              />
              <Area
                type="monotone"
                dataKey="close"
                stroke={color}
                strokeWidth={2}
                fill="url(#g)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
