import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';
import { buildAuthUrl, callbackUrl, isGoogleEnabled } from '@/lib/google';

export const dynamic = 'force-dynamic';

/**
 * 구글 로그인 시작.
 * CSRF 방지용 nonce 와 초대코드를 state 에 담아 쿠키로도 저장한 뒤 대조한다.
 */
export const GET = async (req: Request) => {
  if (!isGoogleEnabled()) {
    return NextResponse.redirect(new URL('/login?error=google_disabled', req.url));
  }

  const invite = new URL(req.url).searchParams.get('invite') ?? '';
  const nonce = randomBytes(16).toString('hex');
  const state = `${nonce}:${encodeURIComponent(invite)}`;

  const jar = await cookies();
  jar.set('g_state', nonce, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 600,
  });

  return NextResponse.redirect(buildAuthUrl(callbackUrl(req), state));
};
