'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/fetcher';
import { won, pct, toneClass } from '@/lib/format';
import {
  CATEGORIES,
  boardOf,
  presetsByCategory,
  type Category,
  type Preset,
} from '@/lib/symbols';

type Q = { symbol: string; price: number; changePct: number };
type Tab = 'ALL' | 'WATCH';

/**
 * 좌측 종목 목록.
 *
 * 종목 이름은 로컬 사전에서 즉시 그리고, 시세는 15개씩 끊어 순차 조회해
 * 도착하는 대로 채운다. 한 번에 70여 종목을 요청하면 외부 API가 막히고
 * 서버리스 함수 시간 제한에도 걸린다.
 */
export default function StockList({
  selected,
  onSelect,
  watchSymbols,
}: {
  selected: string;
  onSelect: (symbol: string) => void;
  watchSymbols: string[];
}) {
  const [tab, setTab] = useState<Tab>('ALL');
  const [cat, setCat] = useState<Category>('ALL');
  const [quotes, setQuotes] = useState<Record<string, Q>>({});
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const reqId = useRef(0);

  const watchSet = useMemo(() => new Set(watchSymbols), [watchSymbols]);

  const list: Preset[] = useMemo(() => {
    const base =
      tab === 'WATCH'
        ? presetsByCategory('ALL').filter((p) => watchSet.has(p.symbol))
        : presetsByCategory(cat);
    const s = q.trim().toLowerCase();
    if (!s) return base;
    return base.filter(
      (p) =>
        p.name.toLowerCase().includes(s) ||
        p.symbol.toLowerCase().includes(s) ||
        p.keywords.toLowerCase().includes(s)
    );
  }, [tab, cat, q, watchSet]);

  /** 보이는 목록의 시세를 15개씩 나눠 채운다 */
  const loadQuotes = useCallback(async (symbols: string[]) => {
    const id = ++reqId.current;
    setLoading(true);
    try {
      for (let i = 0; i < symbols.length; i += 15) {
        if (reqId.current !== id) return; // 탭이 바뀌면 중단
        const chunk = symbols.slice(i, i + 15);
        try {
          const r = await api<{ quotes: Q[] }>(
            `/api/quote?symbols=${encodeURIComponent(chunk.join(','))}`
          );
          if (reqId.current !== id) return;
          setQuotes((prev) => {
            const next = { ...prev };
            for (const x of r.quotes) next[x.symbol.toUpperCase()] = x;
            return next;
          });
        } catch {
          /* 일부 실패는 무시하고 계속 */
        }
      }
    } finally {
      if (reqId.current === id) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const symbols = list.map((p) => p.symbol);
    if (symbols.length) loadQuotes(symbols);
    // 목록 구성이 바뀔 때만. 검색어 입력마다 재조회하지 않도록 tab/cat 만 의존
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, cat, watchSymbols.join(','), loadQuotes]);

  return (
    <div className="card flex h-full flex-col !p-0">
      {/* 탭 */}
      <div className="flex border-b border-line">
        {([
          ['ALL', '전체종목'],
          ['WATCH', '관심종목'],
        ] as [Tab, string][]).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`flex-1 py-2.5 text-sm font-semibold transition ${
              tab === k
                ? 'border-b-2 border-brand text-white'
                : 'text-muted hover:text-slate-300'
            }`}
          >
            {label}
            {k === 'WATCH' && watchSymbols.length > 0 && (
              <span className="ml-1 text-xs text-muted">{watchSymbols.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* 검색 + 카테고리 */}
      <div className="space-y-1.5 border-b border-line p-2.5">
        <input
          className="input !py-2 !text-sm"
          placeholder="목록에서 찾기"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {tab === 'ALL' && (
          <div className="flex flex-wrap gap-1">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => setCat(c.key)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                  cat === c.key
                    ? 'bg-brand text-white'
                    : 'bg-panel2 text-muted hover:text-slate-200'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 목록 */}
      <ul className="max-h-[60vh] flex-1 overflow-y-auto lg:max-h-[calc(100vh-230px)]">
        {list.length === 0 && (
          <li className="px-4 py-10 text-center text-sm text-muted">
            {tab === 'WATCH' ? '관심종목이 없습니다. ☆ 를 눌러 추가하세요' : '결과가 없습니다'}
          </li>
        )}

        {list.map((p) => {
          const quote = quotes[p.symbol.toUpperCase()];
          const active = selected === p.symbol;
          return (
            <li key={p.symbol}>
              <button
                onClick={() => onSelect(p.symbol)}
                className={`flex w-full items-center gap-2 border-b border-line/50 px-2.5 py-1.5 text-left transition ${
                  active ? 'bg-brand/15 ring-1 ring-inset ring-brand' : 'hover:bg-panel2'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold leading-tight">{p.name}</div>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted">
                    <span className="chip !px-1.5 !py-0">{boardOf(p.symbol)}</span>
                    <span className="truncate">{p.symbol.replace(/\.(KS|KQ)$/, '')}</span>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  {quote ? (
                    <>
                      <div className="text-[13px] font-medium leading-tight tabular-nums">{won(quote.price)}</div>
                      <div className={`text-[11px] tabular-nums ${toneClass(quote.changePct)}`}>
                        {quote.changePct > 0 ? '▲' : quote.changePct < 0 ? '▼' : '-'}{' '}
                        {pct(quote.changePct)}
                      </div>
                    </>
                  ) : (
                    <div className="h-7 w-14 animate-pulse rounded bg-panel2" />
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-line px-3 py-2 text-[11px] text-muted">
        {loading ? '시세 불러오는 중...' : `${list.length}종목`}
      </div>
    </div>
  );
}
