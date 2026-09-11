import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { config } from '@/lib/config';
import { signSession, setSessionCookie } from '@/lib/auth';
import { handler, ok, HttpError } from '@/lib/api';

const Body = z.object({
  email: z.string().email('이메일 형식이 올바르지 않습니다.'),
  name: z.string().min(1, '이름을 입력하세요.').max(20),
  password: z.string().min(6, '비밀번호는 6자 이상이어야 합니다.'),
  inviteCode: z.string().optional(),
});

export const POST = handler(async (req: Request) => {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) throw new HttpError(parsed.error.errors[0].message);
  const { email, name, password, inviteCode } = parsed.data;

  if (config.inviteCode && inviteCode?.trim() !== config.inviteCode) {
    throw new HttpError('초대코드가 올바르지 않습니다.');
  }

  const lower = email.toLowerCase();
  if (await prisma.user.findUnique({ where: { email: lower } })) {
    throw new HttpError('이미 가입된 이메일입니다.');
  }

  const user = await prisma.user.create({
    data: {
      email: lower,
      name,
      password: await bcrypt.hash(password, 10),
      role: config.adminEmails.includes(lower) ? 'ADMIN' : 'USER',
      cash: config.seedCash,
      seedCash: config.seedCash,
    },
  });

  await setSessionCookie(
    await signSession({ uid: user.id, email: user.email, name: user.name, role: user.role })
  );
  return ok({ id: user.id, name: user.name, role: user.role });
});
