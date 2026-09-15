import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { RESET_PASSWORD } from '@/lib/config';
import { signSession, setSessionCookie } from '@/lib/auth';
import { handler, ok, requireUser, HttpError } from '@/lib/api';

export const dynamic = 'force-dynamic';

const Body = z.object({
  currentPassword: z.string().default(''),
  newPassword: z
    .string()
    .min(6, '새 비밀번호는 6자 이상이어야 합니다.')
    .max(64, '새 비밀번호는 64자 이하로 해주세요.'),
});

/** 내 비밀번호 변경. 초기화 후 강제 변경도 여기서 처리한다 */
export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) throw new HttpError(parsed.error.errors[0].message);
  const { currentPassword, newPassword } = parsed.data;

  // 구글로만 가입한 계정은 기존 비밀번호가 없으므로 확인을 건너뛴다
  if (user.password) {
    if (!(await bcrypt.compare(currentPassword, user.password))) {
      throw new HttpError('현재 비밀번호가 틀렸습니다.');
    }
    if (await bcrypt.compare(newPassword, user.password)) {
      throw new HttpError('지금 쓰는 비밀번호와 다른 비밀번호로 정해주세요.');
    }
  }
  if (newPassword === RESET_PASSWORD) {
    throw new HttpError('초기화용 비밀번호는 쓸 수 없어요. 다른 비밀번호로 정해주세요.');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { password: await bcrypt.hash(newPassword, 10), mustChangePassword: false },
  });

  // 강제 변경 플래그가 빠진 새 세션으로 교체
  await setSessionCookie(
    await signSession({ uid: user.id, email: user.email, name: user.name, role: user.role })
  );
  return ok({ ok: true });
});
