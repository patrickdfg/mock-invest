import { prisma } from './db';
import { getQuotes } from './market';
import { kstDateString } from './format';

export type RankRow = {
  rank: number;
  userId: string;
  name: string;
  totalValue: number;
  seedCash: number;
  pnl: number;
  pnlPct: number;
  holdingCount: number;
  topHolding: string | null;
  tradeCount: number;
};

/**
 * 전체 참가자 순위.
 * 종목 시세는 한 번에 모아 조회한다(10명 * 몇 종목이라 단일 배치로 충분).
 * 조회한 김에 오늘자 자산 스냅샷도 갱신해 자산 추이 그래프 데이터를 쌓는다.
 */
export async function getRanking(): Promise<RankRow[]> {
  const users = await prisma.user.findMany({
    include: { holdings: true, _count: { select: { orders: true } } },
  });

  const allSymbols = users.flatMap((u) => u.holdings.map((h) => h.symbol));
  const quotes = await getQuotes(allSymbols);

  const rows = users.map((u) => {
    let stockValue = 0;
    let top: { name: string; value: number } | null = null;

    for (const h of u.holdings) {
      const q = quotes.get(h.symbol.toUpperCase());
      const value = (q?.price ?? h.avgPrice) * h.quantity;
      stockValue += value;
      if (!top || value > top.value) top = { name: h.name, value };
    }

    const totalValue = u.cash + stockValue;
    return {
      rank: 0,
      userId: u.id,
      name: u.name,
      totalValue,
      seedCash: u.seedCash,
      pnl: totalValue - u.seedCash,
      pnlPct: u.seedCash > 0 ? ((totalValue - u.seedCash) / u.seedCash) * 100 : 0,
      holdingCount: u.holdings.length,
      topHolding: top?.name ?? null,
      tradeCount: u._count.orders,
    };
  });

  rows.sort((a, b) => b.pnlPct - a.pnlPct);
  rows.forEach((r, i) => (r.rank = i + 1));

  await saveSnapshots(rows).catch(() => {});
  return rows;
}

/** 오늘(KST) 기준 자산 스냅샷 upsert */
async function saveSnapshots(rows: RankRow[]) {
  const date = kstDateString();
  await Promise.all(
    rows.map((r) =>
      prisma.snapshot.upsert({
        where: { userId_date: { userId: r.userId, date } },
        create: { userId: r.userId, date, totalValue: r.totalValue },
        update: { totalValue: r.totalValue },
      })
    )
  );
}
