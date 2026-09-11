import { getQuotes } from '@/lib/market';
import { handler, ok, requireUser, HttpError } from '@/lib/api';

export const dynamic = 'force-dynamic';

export const GET = handler(async (req: Request) => {
  await requireUser();
  const raw = new URL(req.url).searchParams.get('symbols') ?? '';
  const symbols = raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (symbols.length === 0) throw new HttpError('symbols 파라미터가 필요합니다.');
  if (symbols.length > 30) throw new HttpError('한 번에 최대 30개까지 조회할 수 있습니다.');
  const map = await getQuotes(symbols);
  return ok({ quotes: [...map.values()] });
});
