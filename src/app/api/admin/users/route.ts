import { prisma } from '@/lib/db';
import { handler, ok, requireAdmin, HttpError } from '@/lib/api';

export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  const me = await requireAdmin();
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
  return ok({ users, me: me.id });
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

/** 관리자 권한 부여/회수 */
export const PATCH = handler(async (req: Request) => {
  const me = await requireAdmin();
  const body = (await req.json()) as { userId?: string; role?: string };
  const { userId, role } = body;

  if (!userId || (role !== 'ADMIN' && role !== 'USER')) {
    throw new HttpError('userId 와 role(ADMIN|USER)이 필요합니다.');
  }
  if (userId === me.id && role === 'USER') {
    throw new HttpError('자기 권한은 스스로 내릴 수 없습니다. 다른 관리자에게 요청하세요.');
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw new HttpError('사용자를 찾을 수 없습니다.', 404);

  // 마지막 관리자를 잃으면 아무도 관리 화면에 못 들어간다
  if (role === 'USER' && target.role === 'ADMIN') {
    const admins = await prisma.user.count({ where: { role: 'ADMIN' } });
    if (admins <= 1) throw new HttpError('관리자가 최소 한 명은 있어야 합니다.');
  }

  const user = await prisma.user.update({ where: { id: userId }, data: { role } });
  return ok({ id: user.id, name: user.name, role: user.role });
});
