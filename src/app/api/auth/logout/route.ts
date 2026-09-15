import { NextResponse } from 'next/server';
import { clearSessionCookie, SESSION_COOKIE } from '@/lib/auth';
import { handler, ok } from '@/lib/api';

export const POST = handler(async () => {
  await clearSessionCookie();
  return ok({ ok: true });
});

/**
 * 세션 쿠키를 지우고 로그인 화면으로 보낸다.
 * 토큰은 유효한데 DB 에 계정이 없을 때(관리자가 삭제 등) 앱 레이아웃이 여기로 보낸다.
 * 미들웨어는 토큰 서명만 확인하므로, 이 경로가 없으면 /login 과 /dashboard 사이를 무한 리다이렉트한다.
 */
export const GET = async (req: Request) => {
  const res = NextResponse.redirect(new URL('/login', req.url));
  res.cookies.delete(SESSION_COOKIE);
  return res;
};
