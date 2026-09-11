import { getPortfolio, settlePending } from '@/lib/trade';
import { handler, ok, requireUser } from '@/lib/api';

export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  const user = await requireUser();
  await settlePending(user.id); // 지정가 지연 체결 처리
  return ok(await getPortfolio(user.id));
});
