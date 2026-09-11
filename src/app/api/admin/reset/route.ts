import { z } from 'zod';
import { prisma } from '@/lib/db';
import { config } from '@/lib/config';
import { handler, ok, requireAdmin, HttpError } from '@/lib/api';

export const dynamic = 'force-dynamic';

const Body = z.object({
  userId: z.string().min(1),
  seedCash: z.coerce.number().positive().optional(),
});

/** 특정 참가자의 계좌를 초기화(보유·주문 삭제 + 시드머니 재지급) */
export const POST = handler(async (req: Request) => {
  await requireAdmin();
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) throw new HttpError('userId가 필요합니다.');

  const { userId } = parsed.data;
  const seed = parsed.data.seedCash ?? config.seedCash;

  await prisma.$transaction([
    prisma.holding.deleteMany({ where: { userId } }),
    prisma.order.deleteMany({ where: { userId } }),
    prisma.snapshot.deleteMany({ where: { userId } }),
    prisma.user.update({ where: { id: userId }, data: { cash: seed, seedCash: seed } }),
  ]);

  return ok({ ok: true });
});
