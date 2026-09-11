'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, post, del } from '@/lib/fetcher';
import { won, pct, toneClass, kstTimeString } from '@/lib/format';
import { Spinner, Empty, ErrorBox } from '@/components/ui';
import PriceChart from '@/components/PriceChart';
import StockList from '@/components/StockList';

type Quote = {
  symbol: string; name: string; market: string; currency: string;
  price: number; prevClose: number; nativePrice: number;
  change: number; changePct: number; fxRate: number; stale: boolean;
};
type Order = {
  id: string; symbol: string; name: string; side: string; type: string;
  quantity: number; limitPrice: number | null; status: string; createdAt: string;
};
type Portfolio = { cash: number; rows: { symbol: string; quantity: number; avgPrice: number }[] };

function TradeInner() {
  const initial = useSearchParams().get('symbol') ?? '005930.KS';
  const [symbol, setSymbol] = useState(initial);
  // 모바일에서는 종목을 고르면 상세를 전체화면 팝업으로 띄운다.
  // 데스크톱에서는 항상 우측에 붙어 있으므로 이 값이 영향을 주지 않는다.
  const [detailOpen, setDetailOpen] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [pf, setPf] = useState<Portfolio | null>(null);
  const [pending, setPending] = useState<Order[]>([]);
  const [watch, setWatch] = useState<string[]>([]);

  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [type, setType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [qty, setQty] = useState('1');
  const [limitPrice, setLimitPrice] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const loadAccount = useCallback(async () => {
    const [p, o, w] = await Promise.all([
      api<Portfolio>('/api/portfolio'),
      api<{ orders: Order[] }>('/api/orders?status=PENDING'),
      api<{ items: { symbol: string }[] }>('/api/watchlist').catch(() => ({ items: [] })),
    ]);
    setPf(p);
    setPending(o.orders);
    setWatch(w.items.map((i) => i.symbol));
  }, []);

  const loadQuote = useCallback(async (sym: string) => {
    const r = await api<{ quotes: Quote[] }>(`/api/quote?symbols=${encodeURIComponent(sym)}`);
    setQuote(r.quotes[0] ?? null);
  }, []);

  useEffect(() => { loadAccount(); }, [loadAccount]);

  // 팝업이 열려 있는 동안 뒤 목록이 같이 스크롤되지 않게 막는다
  useEffect(() => {
    if (!detailOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [detailOpen]);

  // 팝업이 열린 상태에서 뒤로가기를 누르면 팝업만 닫는다
  useEffect(() => {
    if (!detailOpen) return;
    const onPop = (e: PopStateEvent) => { e.preventDefault(); setDetailOpen(false); };
    window.history.pushState({ detail: true }, '');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [detailOpen]);

  function selectSymbol(s: string) {
    setSymbol(s);
    setDetailOpen(true);
  }
  useEffect(() => {
    setQuote(null);
    setMsg('');
    setErr('');
    loadQuote(symbol).catch(() => setQuote(null));
    const t = setInterval(() => loadQuote(symbol).catch(() => {}), 20_000);
    return () => clearInterval(t);
  }, [symbol, loadQuote]);

  const held = pf?.rows.find((r) => r.symbol === symbol);
  const price = type === 'LIMIT' && Number(limitPrice) > 0 ? Number(limitPrice) : (quote?.price ?? 0);
  const qtyNum = Number(qty) || 0;
  const amount = price * qtyNum;
  const feeRate = quote?.market === 'US' ? 0.0025 : 0.00015;
  const fee = Math.floor(amount * feeRate);
  const tax = side === 'SELL' && quote?.market === 'KR' ? Math.floor(amount * 0.0018) : 0;
  const settle = side === 'BUY' ? amount + fee : amount - fee - tax;
  const maxBuy = price > 0 && pf ? Math.floor(pf.cash / (price * (1 + feeRate))) : 0;
  const watched = watch.includes(symbol);

  async function submit() {
    setErr(''); setMsg(''); setBusy(true);
    try {
      await post('/api/orders', {
        symbol, side, type,
        quantity: qtyNum,
        limitPrice: type === 'LIMIT' ? Number(limitPrice) : null,
      });
      setMsg(
        type === 'MARKET'
          ? `${quote?.name} ${qtyNum}주 ${side === 'BUY' ? '매수' : '매도'} 체결 완료`
          : '지정가 주문 접수. 조건 도달 시 자동 체결됩니다.'
      );
      setQty('1');
      await loadAccount();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleWatch() {
    if (watched) {
      await del(`/api/watchlist?symbol=${encodeURIComponent(symbol)}`);
      setWatch(watch.filter((s) => s !== symbol));
    } else {
      await post('/api/watchlist', { symbol });
      setWatch([...watch, symbol]);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
      {/* 좌측: 종목 목록 */}
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <StockList selected={symbol} onSelect={selectSymbol} watchSymbols={watch} />
      </aside>

      {/* 우측 상세. 모바일에서는 전체화면 팝업, lg 이상에서는 평범한 컬럼 */}
      <div
        className={`${
          detailOpen ? 'fixed inset-0 z-50 overflow-y-auto bg-bg p-3 pb-24' : 'hidden'
        } space-y-4 lg:static lg:z-auto lg:block lg:overflow-visible lg:bg-transparent lg:p-0`}
      >
        {/* 모바일 전용 헤더 (닫기) */}
        <div className="sticky top-0 z-10 -mx-3 mb-1 flex items-center justify-between border-b border-line bg-bg/95 px-3 py-2 backdrop-blur lg:hidden">
          <span className="text-sm font-bold">{quote?.name ?? '종목 상세'}</span>
          <button
            onClick={() => setDetailOpen(false)}
            className="btn-ghost !px-3 !py-1.5 !text-xs"
            aria-label="닫기"
          >
            ✕ 닫기
          </button>
        </div>

        <div className="grid gap-4 xl:grid-cols-5">
          {/* 시세 + 차트 */}
          <section className="card xl:col-span-3">
            {!quote ? (
              <Spinner label="시세 불러오는 중..." />
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h1 className="truncate text-lg font-bold">{quote.name}</h1>
                      <button
                        onClick={toggleWatch}
                        className={`text-lg leading-none ${watched ? 'text-yellow-400' : 'text-muted'}`}
                        aria-label="관심종목"
                      >
                        {watched ? '★' : '☆'}
                      </button>
                    </div>
                    <div className="mt-0.5 text-xs text-muted">
                      {quote.symbol} · {quote.market === 'KR' ? '국내' : '해외'}
                      {quote.market === 'US' &&
                        ` · $${quote.nativePrice.toFixed(2)} (환율 ${won(quote.fxRate)})`}
                      {quote.stale && ' · ⚠ 지연된 캐시 시세'}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-2xl font-bold tabular-nums">{won(quote.price)}원</div>
                    <div className={`text-sm tabular-nums ${toneClass(quote.change)}`}>
                      {quote.change >= 0 ? '+' : ''}
                      {won(Math.round(quote.change))} ({pct(quote.changePct)})
                    </div>
                  </div>
                </div>

                {held && (
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 rounded-xl bg-panel2 px-3 py-2 text-xs">
                    <span className="text-muted">
                      보유 <b className="text-slate-200">{won(held.quantity, 4)}주</b>
                    </span>
                    <span className="text-muted">
                      평균단가 <b className="text-slate-200">{won(held.avgPrice)}원</b>
                    </span>
                    <span className="text-muted">
                      평가손익{' '}
                      <b className={toneClass((quote.price - held.avgPrice) * held.quantity)}>
                        {won(Math.round((quote.price - held.avgPrice) * held.quantity))}원
                      </b>
                    </span>
                  </div>
                )}

                <div className="mt-4">
                  <PriceChart symbol={symbol} />
                </div>
              </>
            )}
          </section>

          {/* 주문 패널 */}
          <section className="card xl:col-span-2">
            <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-panel2 p-1">
              {(['BUY', 'SELL'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSide(s)}
                  className={`rounded-lg py-2 text-sm font-bold transition ${
                    side === s
                      ? s === 'BUY' ? 'bg-up text-white' : 'bg-down text-white'
                      : 'text-muted hover:text-slate-200'
                  }`}
                >
                  {s === 'BUY' ? '매수' : '매도'}
                </button>
              ))}
            </div>

            <div className="mb-3 flex gap-1">
              {(['MARKET', 'LIMIT'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`flex-1 rounded-lg border py-1.5 text-xs font-medium transition ${
                    type === t ? 'border-brand text-brand' : 'border-line text-muted'
                  }`}
                >
                  {t === 'MARKET' ? '시장가' : '지정가'}
                </button>
              ))}
            </div>

            {type === 'LIMIT' && (
              <div className="mb-3">
                <label className="label">지정가 (원)</label>
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  placeholder={quote ? String(Math.round(quote.price)) : ''}
                />
              </div>
            )}

            <div className="mb-3">
              <div className="mb-1.5 flex items-center justify-between">
                <label className="label !mb-0">수량 (주)</label>
                <span className="text-[11px] text-muted">
                  {side === 'BUY' ? `최대 ${won(maxBuy)}주` : `보유 ${won(held?.quantity ?? 0, 4)}주`}
                </span>
              </div>
              <input
                className="input"
                type="number"
                min={0}
                step={quote?.market === 'US' ? 0.0001 : 1}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
              <div className="mt-2 grid grid-cols-4 gap-1">
                {[0.1, 0.25, 0.5, 1].map((r) => {
                  const base = side === 'BUY' ? maxBuy : (held?.quantity ?? 0);
                  const v = quote?.market === 'US' ? +(base * r).toFixed(4) : Math.floor(base * r);
                  return (
                    <button
                      key={r}
                      onClick={() => setQty(String(v))}
                      className="rounded-lg border border-line py-1 text-[11px] text-muted hover:border-slate-500"
                    >
                      {r === 1 ? '최대' : `${r * 100}%`}
                    </button>
                  );
                })}
              </div>
            </div>

            <dl className="mb-3 space-y-1.5 rounded-xl bg-panel2 p-3 text-xs">
              <div className="flex justify-between">
                <dt className="text-muted">주문 금액</dt>
                <dd className="tabular-nums">{won(amount)}원</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">수수료</dt>
                <dd className="tabular-nums">{won(fee)}원</dd>
              </div>
              {side === 'SELL' && (
                <div className="flex justify-between">
                  <dt className="text-muted">거래세</dt>
                  <dd className="tabular-nums">{won(tax)}원</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-line pt-1.5 font-semibold">
                <dt>{side === 'BUY' ? '총 필요 금액' : '실 수령액'}</dt>
                <dd className="tabular-nums">{won(settle)}원</dd>
              </div>
              <div className="flex justify-between text-muted">
                <dt>주문 가능 현금</dt>
                <dd className="tabular-nums">{won(pf?.cash ?? 0)}원</dd>
              </div>
            </dl>

            {err && <div className="mb-2"><ErrorBox message={err} /></div>}
            {msg && (
              <div className="mb-2 rounded-xl border border-brand/40 bg-brand/10 px-3.5 py-2.5 text-sm text-brand">
                {msg}
              </div>
            )}

            <button
              onClick={submit}
              disabled={busy || qtyNum <= 0 || !quote}
              className={`${side === 'BUY' ? 'btn-buy' : 'btn-sell'} w-full !py-3`}
            >
              {busy ? '처리 중...' : `${quote?.name ?? ''} ${side === 'BUY' ? '매수' : '매도'}`}
            </button>
          </section>
        </div>

      </div>

        {/* 미체결 주문 */}
        <section className="card lg:col-span-2">
          <h2 className="mb-3 font-semibold">미체결 주문</h2>
          {pending.length === 0 ? (
            <Empty>대기 중인 지정가 주문이 없습니다</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px]">
                <thead>
                  <tr className="border-b border-line">
                    <th className="th">시각</th>
                    <th className="th">종목</th>
                    <th className="th">구분</th>
                    <th className="th text-right">수량</th>
                    <th className="th text-right">지정가</th>
                    <th className="th text-right">취소</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map((o) => (
                    <tr key={o.id} className="border-b border-line/50 last:border-0">
                      <td className="td text-muted">{kstTimeString(new Date(o.createdAt))}</td>
                      <td className="td">{o.name}</td>
                      <td className={`td font-medium ${o.side === 'BUY' ? 'text-up' : 'text-down'}`}>
                        {o.side === 'BUY' ? '매수' : '매도'}
                      </td>
                      <td className="td text-right">{won(o.quantity, 4)}</td>
                      <td className="td text-right">{won(o.limitPrice ?? 0)}</td>
                      <td className="td text-right">
                        <button
                          onClick={async () => {
                            await del(`/api/orders?id=${o.id}`);
                            loadAccount();
                          }}
                          className="text-xs text-muted hover:text-up"
                        >
                          취소
                        </button>
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

export default function TradePage() {
  return (
    <Suspense fallback={<Spinner />}>
      <TradeInner />
    </Suspense>
  );
}
