import { searchSymbols } from '@/lib/market';
import { handler, ok, requireUser } from '@/lib/api';

export const dynamic = 'force-dynamic';

export const GET = handler(async (req: Request) => {
  await requireUser();
  const q = new URL(req.url).searchParams.get('q') ?? '';
  return ok({ results: await searchSymbols(q) });
});
