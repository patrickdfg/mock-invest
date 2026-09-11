import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getQuote, getQuotes } from '@/lib/market';
import { normalizeSymbol, marketOf } from '@/lib/symbols';
import { handler, ok, requireUser, HttpError } from '@/lib/api';

export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  const user = await requireUser();
  const items = await prisma.watchlist.findMany({ where: { userId: user.id } });
  const quotes = await getQuotes(items.map((i) => i.symbol));
  return ok({
    items: items.map((i) => ({ ...i, quote: quotes.get(i.symbol.toUpperCase()) ?? null })),
  });
});

export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  const parsed = z.object({ symbol: z.string().min(1) }).safeParse(await req.json());
  if (!parsed.success) throw new HttpError('symbol이 필요합니다.');

  const symbol = normalizeSymbol(parsed.data.symbol);
  const count = await prisma.watchlist.count({ where: { userId: user.id } });
  if (count >= 30) throw new HttpError('관심종목은 최대 30개까지 등록할 수 있습니다.');

  const q = await getQuote(symbol); // 유효성 검사 겸 이름 확보
  const item = await prisma.watchlist.upsert({
    where: { userId_symbol: { userId: user.id, symbol } },
    create: { userId: user.id, symbol, name: q.name, market: marketOf(symbol) },
    update: { name: q.name },
  });
  return ok({ item });
});

export const DELETE = handler(async (req: Request) => {
  const user = await requireUser();
  const symbol = new URL(req.url).searchParams.get('symbol');
  if (!symbol) throw new HttpError('symbol이 필요합니다.');
  await prisma.watchlist
    .delete({ where: { userId_symbol: { userId: user.id, symbol: normalizeSymbol(symbol) } } })
    .catch(() => {});
  return ok({ ok: true });
});
