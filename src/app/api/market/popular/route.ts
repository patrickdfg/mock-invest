import { prisma } from '@/lib/db';
import { handler, ok, requireUser } from '@/lib/api';

export const dynamic = 'force-dynamic';

/**
 * 리그 안에서의 인기 종목: 종목별로 보유한 참가자 수와 관심종목에 담은 참가자 수.
 * 외부 데이터가 아니라 우리 반 친구들이 실제로 담은 종목이라 더 의미가 있다.
 */
export const GET = handler(async () => {
  await requireUser();
  const [holds, watches] = await Promise.all([
    prisma.holding.groupBy({ by: ['symbol'], _count: { _all: true } }),
    prisma.watchlist.groupBy({ by: ['symbol'], _count: { _all: true } }),
  ]);

  const map = new Map<string, { symbol: string; holders: number; watchers: number }>();
  for (const h of holds) {
    map.set(h.symbol, { symbol: h.symbol, holders: h._count._all, watchers: 0 });
  }
  for (const w of watches) {
    const cur = map.get(w.symbol) ?? { symbol: w.symbol, holders: 0, watchers: 0 };
    cur.watchers = w._count._all;
    map.set(w.symbol, cur);
  }
  return ok({ items: [...map.values()] });
});
