import { getHistory } from '@/lib/market';
import { handler, ok, requireUser, HttpError } from '@/lib/api';
import { normalizeSymbol } from '@/lib/symbols';

export const dynamic = 'force-dynamic';

const RANGES = new Set(['5d', '1mo', '3mo', '6mo', '1y', '5y']);

export const GET = handler(async (req: Request) => {
  await requireUser();
  const sp = new URL(req.url).searchParams;
  const symbol = sp.get('symbol');
  if (!symbol) throw new HttpError('symbol 파라미터가 필요합니다.');
  const range = sp.get('range') ?? '3mo';
  if (!RANGES.has(range)) throw new HttpError('지원하지 않는 기간입니다.');
  return ok({ candles: await getHistory(normalizeSymbol(symbol), range) });
});
