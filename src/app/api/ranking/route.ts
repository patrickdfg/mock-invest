import { prisma } from '@/lib/db';
import { getRanking } from '@/lib/ranking';
import { settlePending } from '@/lib/trade';
import { handler, ok, requireUser } from '@/lib/api';

export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  const me = await requireUser();
  await settlePending(); // 전체 대기주문 체결 판정 후 순위 계산
  const rows = await getRanking();

  const snapshots = await prisma.snapshot.findMany({
    orderBy: { date: 'asc' },
    take: 400,
    include: { user: { select: { name: true } } },
  });

  return ok({ me: me.id, rows, snapshots });
});
