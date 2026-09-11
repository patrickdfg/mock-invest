import { prisma } from '@/lib/db';
import { handler, ok, requireAdmin, HttpError } from '@/lib/api';

export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  await requireAdmin();
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      cash: true,
      seedCash: true,
      createdAt: true,
      _count: { select: { orders: true, holdings: true } },
    },
  });
  return ok({ users });
});

/** 참가자 삭제. 보유·주문·스냅샷은 onDelete: Cascade 로 같이 지워진다 */
export const DELETE = handler(async (req: Request) => {
  const me = await requireAdmin();
  const userId = new URL(req.url).searchParams.get('userId');
  if (!userId) throw new HttpError('userId가 필요합니다.');
  if (userId === me.id) throw new HttpError('자기 계정은 삭제할 수 없습니다.');

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw new HttpError('사용자를 찾을 수 없습니다.', 404);

  await prisma.user.delete({ where: { id: userId } });
  return ok({ ok: true, deleted: target.email });
});
