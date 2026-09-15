import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { RESET_PASSWORD } from '@/lib/config';
import { handler, ok, requireAdmin, HttpError } from '@/lib/api';

export const dynamic = 'force-dynamic';

/**
 * 참가자 비밀번호를 임시 비밀번호(0000)로 초기화.
 * 계좌·거래 기록은 그대로 두고, 다음 로그인 때 새 비밀번호로 바꾸게 강제한다.
 */
export const POST = handler(async (req: Request) => {
  const me = await requireAdmin();
  const parsed = z.object({ userId: z.string().min(1) }).safeParse(await req.json());
  if (!parsed.success) throw new HttpError('userId가 필요합니다.');
  const { userId } = parsed.data;

  if (userId === me.id) {
    throw new HttpError('자기 비밀번호는 상단의 "비밀번호" 메뉴에서 바꿔주세요.');
  }
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw new HttpError('사용자를 찾을 수 없습니다.', 404);

  await prisma.user.update({
    where: { id: userId },
    data: { password: await bcrypt.hash(RESET_PASSWORD, 10), mustChangePassword: true },
  });
  return ok({ ok: true, name: target.name, email: target.email });
});
