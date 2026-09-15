import { getHistory, getQuote } from '@/lib/market';
import { normalizeSymbol } from '@/lib/symbols';
import { analyzeStock } from '@/lib/stockAnalysis';
import { handler, ok, requireUser, HttpError } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** 종목 규칙 기반 분석. 외부 AI 호출이 없어 키·비용·횟수 제한이 없다 */
export const GET = handler(async (req: Request) => {
  await requireUser();
  const raw = new URL(req.url).searchParams.get('symbol');
  if (!raw) throw new HttpError('symbol 파라미터가 필요합니다.');
  const symbol = normalizeSymbol(raw);

  const [quote, candles] = await Promise.all([
    getQuote(symbol).catch(() => {
      throw new HttpError('종목을 찾을 수 없어요. 종목 코드를 확인해주세요.', 404);
    }),
    getHistory(symbol, '1y'),
  ]);
  const analysis = analyzeStock(candles, { name: quote.name, price: quote.price });
  if (!analysis) {
    throw new HttpError('분석할 차트 데이터가 부족해요. (최소 30거래일 필요)', 422);
  }
  return ok({ symbol, name: quote.name, analysis });
});
