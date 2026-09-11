import { prisma } from './db';
import { findPreset, marketOf, searchPresets, type Preset } from './symbols';

/**
 * 시세 조회 레이어.
 *
 * 데이터 소스: Yahoo Finance 공개 chart 엔드포인트 (무료, 키 불필요, 약 15분 지연).
 * - 메모리 캐시(20초) -> Yahoo -> DB 캐시 순으로 폴백한다.
 * - 미국 주식은 USD/KRW 환율을 곱해 전부 원화 기준으로 통일한다.
 *   (계좌·손익·랭킹 계산이 단일 통화여야 버그가 안 생긴다)
 */

export type Quote = {
  symbol: string;
  name: string;
  market: 'KR' | 'US';
  currency: string; // 원통화: KRW | USD
  price: number; // 원화 환산 현재가
  prevClose: number; // 원화 환산 전일 종가
  nativePrice: number; // 원통화 현재가
  change: number;
  changePct: number;
  fxRate: number; // USD -> KRW (KR 종목이면 1)
  stale: boolean; // 외부 조회 실패로 캐시를 쓴 경우
};

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36';

const TTL_MS = 20_000;
const mem = new Map<string, { at: number; data: RawQuote }>();

type RawQuote = {
  symbol: string;
  name: string;
  currency: string;
  price: number;
  prevClose: number;
};

async function yfetch(url: string, timeoutMs = 6000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: ctrl.signal,
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`yahoo ${res.status}`);
    return (await res.json()) as any;
  } finally {
    clearTimeout(t);
  }
}

/** Yahoo chart 메타에서 원시 시세 추출 */
async function fetchRaw(symbol: string): Promise<RawQuote> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol
  )}?interval=1d&range=5d`;
  const json = await yfetch(url);
  const meta = json?.chart?.result?.[0]?.meta;
  if (!meta || typeof meta.regularMarketPrice !== 'number') {
    throw new Error(`종목을 찾을 수 없습니다: ${symbol}`);
  }
  const prev =
    typeof meta.chartPreviousClose === 'number'
      ? meta.chartPreviousClose
      : typeof meta.previousClose === 'number'
        ? meta.previousClose
        : meta.regularMarketPrice;

  return {
    symbol: meta.symbol ?? symbol,
    name: meta.longName || meta.shortName || findPreset(symbol)?.name || symbol,
    currency: meta.currency ?? 'USD',
    price: meta.regularMarketPrice,
    prevClose: prev,
  };
}

async function getRaw(symbol: string): Promise<{ raw: RawQuote; stale: boolean }> {
  const key = symbol.toUpperCase();
  const hit = mem.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return { raw: hit.data, stale: false };

  try {
    const raw = await fetchRaw(symbol);
    mem.set(key, { at: Date.now(), data: raw });
    // DB 캐시에도 남겨 외부 장애 시 폴백으로 쓴다
    prisma.quoteCache
      .upsert({
        where: { symbol: key },
        create: {
          symbol: key,
          name: raw.name,
          market: marketOf(key),
          currency: raw.currency,
          price: raw.price,
          prevClose: raw.prevClose,
        },
        update: { name: raw.name, price: raw.price, prevClose: raw.prevClose },
      })
      .catch(() => {});
    return { raw, stale: false };
  } catch (e) {
    const cached = await prisma.quoteCache.findUnique({ where: { symbol: key } });
    if (cached) {
      return {
        raw: {
          symbol: cached.symbol,
          name: cached.name,
          currency: cached.currency,
          price: cached.price,
          prevClose: cached.prevClose,
        },
        stale: true,
      };
    }
    throw e;
  }
}

/** USD -> KRW 환율. 실패 시 1350 고정값 */
export async function getUsdKrw(): Promise<number> {
  try {
    const { raw } = await getRaw('KRW=X');
    if (raw.price > 500 && raw.price < 3000) return raw.price;
  } catch {
    /* ignore */
  }
  return 1350;
}

export async function getQuote(symbol: string): Promise<Quote> {
  const sym = symbol.toUpperCase();
  const market = marketOf(sym);
  const { raw, stale } = await getRaw(sym);
  const fxRate = market === 'US' ? await getUsdKrw() : 1;

  const price = raw.price * fxRate;
  const prevClose = raw.prevClose * fxRate;
  const change = price - prevClose;
  const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;

  return {
    symbol: sym,
    name: findPreset(sym)?.name ?? raw.name,
    market,
    currency: raw.currency,
    price,
    prevClose,
    nativePrice: raw.price,
    change,
    changePct,
    fxRate,
    stale,
  };
}

/** 여러 종목 동시 조회. 실패한 종목은 결과에서 빠진다 */
export async function getQuotes(symbols: string[]): Promise<Map<string, Quote>> {
  const uniq = [...new Set(symbols.map((s) => s.toUpperCase()))];
  const results = await Promise.allSettled(uniq.map((s) => getQuote(s)));
  const map = new Map<string, Quote>();
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') map.set(uniq[i], r.value);
  });
  return map;
}

export type SearchHit = { symbol: string; name: string; market: 'KR' | 'US'; exchange?: string };

/** 로컬 프리셋 우선 -> 부족하면 Yahoo 검색으로 보충 */
export async function searchSymbols(q: string): Promise<SearchHit[]> {
  const query = q.trim();
  if (!query) return [];

  const local: SearchHit[] = searchPresets(query).map((p: Preset) => ({
    symbol: p.symbol,
    name: p.name,
    market: p.market,
  }));

  if (local.length >= 8) return local;

  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
      query
    )}&quotesCount=10&newsCount=0`;
    const json = await yfetch(url, 5000);
    const seen = new Set(local.map((h) => h.symbol.toUpperCase()));
    for (const item of json?.quotes ?? []) {
      const sym: string | undefined = item?.symbol;
      if (!sym || seen.has(sym.toUpperCase())) continue;
      if (item?.quoteType && !['EQUITY', 'ETF', 'INDEX'].includes(item.quoteType)) continue;
      seen.add(sym.toUpperCase());
      local.push({
        symbol: sym.toUpperCase(),
        name: item.shortname || item.longname || sym,
        market: marketOf(sym),
        exchange: item.exchange,
      });
      if (local.length >= 15) break;
    }
  } catch {
    /* 외부 검색 실패해도 로컬 결과는 준다 */
  }

  return local;
}

export type Candle = { date: string; close: number };

/** 차트용 종가 시계열 */
export async function getHistory(symbol: string, range = '3mo'): Promise<Candle[]> {
  const interval = range === '1d' || range === '5d' ? '15m' : '1d';
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol
  )}?interval=${interval}&range=${range}`;
  try {
    const json = await yfetch(url, 8000);
    const r = json?.chart?.result?.[0];
    const ts: number[] = r?.timestamp ?? [];
    const closes: (number | null)[] = r?.indicators?.quote?.[0]?.close ?? [];
    const fx = marketOf(symbol) === 'US' ? await getUsdKrw() : 1;

    const out: Candle[] = [];
    for (let i = 0; i < ts.length; i++) {
      const c = closes[i];
      if (typeof c !== 'number') continue;
      out.push({
        date: new Date(ts[i] * 1000).toISOString().slice(0, interval === '1d' ? 10 : 16),
        close: c * fx,
      });
    }
    return out;
  } catch {
    return [];
  }
}

/** 한국 정규장 여부 (평일 09:00~15:30 KST) */
export function isKrMarketOpen(now = new Date()): boolean {
  const kst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const day = kst.getDay();
  if (day === 0 || day === 6) return false;
  const mins = kst.getHours() * 60 + kst.getMinutes();
  return mins >= 9 * 60 && mins <= 15 * 60 + 30;
}
