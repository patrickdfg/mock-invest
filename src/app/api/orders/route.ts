import { z } from 'zod';
import { prisma } from '@/lib/db';
import { placeOrder, cancelOrder, settlePending } from '@/lib/trade';
import { handler, ok, requireUser, HttpError } from '@/lib/api';

export const dynamic = 'force-dynamic';

export const GET = handler(async (req: Request) => {
  const user = await requireUser();
  await settlePending(user.id);

  const sp = new URL(req.url).searchParams;
  const status = sp.get('status'); // PENDING | FILLED | CANCELED
  const take = Math.min(Number(sp.get('take') ?? 100), 300);

  const orders = await prisma.order.findMany({
    where: { userId: user.id, ...(status ? { status } : {}) },
    orderBy: { createdAt: 'desc' },
    take,
  });
  return ok({ orders });
});

const Body = z.object({
  symbol: z.string().min(1),
  side: z.enum(['BUY', 'SELL']),
  type: z.enum(['MARKET', 'LIMIT']),
  quantity: z.coerce.number().positive(),
  limitPrice: z.coerce.number().positive().nullable().optional(),
});

export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) throw new HttpError(parsed.error.errors[0].message);

  const order = await placeOrder({ userId: user.id, ...parsed.data });
  return ok({ order });
});

export const DELETE = handler(async (req: Request) => {
  const user = await requireUser();
  const id = new URL(req.url).searchParams.get('id');
  if (!id) throw new HttpError('주문 id가 필요합니다.');
  return ok({ order: await cancelOrder(user.id, id) });
});
