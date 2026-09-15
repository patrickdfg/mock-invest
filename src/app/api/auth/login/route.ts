import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { signSession, setSessionCookie } from '@/lib/auth';
import { promoteIfListed } from '@/lib/promote';
import { handler, ok, HttpError } from '@/lib/api';

const Body = z.object({ email: z.string().email(), password: z.string().min(1) });

export const POST = handler(async (req: Request) => {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) throw new HttpError('이메일과 비밀번호를 입력하세요.');

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });
  if (!user) throw new HttpError('이메일 또는 비밀번호가 틀렸습니다.', 401);

  // 구글로 가입한 계정은 비밀번호가 없다
  if (!user.password) {
    throw new HttpError('구글 계정으로 가입된 이메일입니다. 아래 구글 버튼으로 로그인해주세요.', 401);
  }
  if (!(await bcrypt.compare(parsed.data.password, user.password))) {
    throw new HttpError('이메일 또는 비밀번호가 틀렸습니다.', 401);
  }

  const role = await promoteIfListed(user);

  const mustChangePassword = user.mustChangePassword;
  await setSessionCookie(
    await signSession({
      uid: user.id,
      email: user.email,
      name: user.name,
      role,
      ...(mustChangePassword ? { mcp: true } : {}),
    })
  );
  return ok({ id: user.id, name: user.name, role, mustChangePassword });
});
