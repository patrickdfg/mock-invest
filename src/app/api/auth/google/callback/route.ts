import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { config } from '@/lib/config';
import { signSession, setSessionCookie } from '@/lib/auth';
import { callbackUrl, exchangeCode, isGoogleEnabled } from '@/lib/google';

export const dynamic = 'force-dynamic';

function back(req: Request, path: string) {
  return NextResponse.redirect(new URL(path, req.url));
}

export const GET = async (req: Request) => {
  if (!isGoogleEnabled()) return back(req, '/login?error=google_disabled');

  const sp = new URL(req.url).searchParams;
  if (sp.get('error')) return back(req, '/login?error=google_canceled');

  const code = sp.get('code');
  const state = sp.get('state') ?? '';
  if (!code) return back(req, '/login?error=google_failed');

  // state 검증 (CSRF)
  const jar = await cookies();
  const [nonce, inviteRaw = ''] = state.split(':');
  if (!nonce || jar.get('g_state')?.value !== nonce) {
    return back(req, '/login?error=state_mismatch');
  }
  jar.delete('g_state');
  const invite = decodeURIComponent(inviteRaw);

  try {
    const profile = await exchangeCode(code, callbackUrl(req));
    const email = profile.email.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      // 기존 계정이면 구글 정보만 연결해두고 로그인시킨다
      const user = await prisma.user.update({
        where: { id: existing.id },
        data: {
          googleId: existing.googleId ?? profile.sub,
          image: profile.picture ?? existing.image,
        },
      });
      await setSessionCookie(
        await signSession({ uid: user.id, email: user.email, name: user.name, role: user.role })
      );
      return back(req, '/dashboard');
    }

    // 신규 가입은 초대코드를 통과해야 한다
    if (config.inviteCode && invite !== config.inviteCode) {
      return back(req, '/signup?error=invite_required');
    }

    const user = await prisma.user.create({
      data: {
        email,
        name: profile.name?.trim() || email.split('@')[0],
        password: null,
        provider: 'google',
        googleId: profile.sub,
        image: profile.picture,
        role: config.adminEmails.includes(email) ? 'ADMIN' : 'USER',
        cash: config.seedCash,
        seedCash: config.seedCash,
      },
    });

    await setSessionCookie(
      await signSession({ uid: user.id, email: user.email, name: user.name, role: user.role })
    );
    return back(req, '/dashboard');
  } catch (e: any) {
    console.error('[google-callback]', e);
    return back(req, '/login?error=google_failed');
  }
};
