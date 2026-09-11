import { prisma } from '@/lib/db';
import { handler, ok, requireAdmin } from '@/lib/api';

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
