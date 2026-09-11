import { handler, ok, requireUser } from '@/lib/api';

export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  const u = await requireUser();
  return ok({ id: u.id, email: u.email, name: u.name, role: u.role, cash: u.cash });
});
