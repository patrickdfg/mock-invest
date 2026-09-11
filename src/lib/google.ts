import { config } from './config';

/**
 * 구글 OAuth 2.0 (Authorization Code Flow) 최소 구현.
 *
 * next-auth 를 쓰지 않은 이유: 이 앱은 이미 자체 JWT 세션을 쓰고 있어서
 * 라이브러리를 넣으면 세션 계층이 이중이 된다. 필요한 건 아래 세 단계뿐이다.
 *   1) 구글 동의 화면으로 보내기
 *   2) 돌아온 code 를 access_token 으로 교환
 *   3) 토큰으로 프로필(sub, email, name, picture) 조회
 */

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

export function isGoogleEnabled() {
  return Boolean(config.googleClientId && config.googleClientSecret);
}

/** 요청 origin 에서 콜백 주소를 만든다 (로컬/프리뷰/프로덕션 모두 대응) */
export function callbackUrl(req: Request) {
  const url = new URL(req.url);
  const host = req.headers.get('x-forwarded-host') ?? url.host;
  const proto = req.headers.get('x-forwarded-proto') ?? url.protocol.replace(':', '');
  return `${proto}://${host}/api/auth/google/callback`;
}

export function buildAuthUrl(redirectUri: string, state: string) {
  const params = new URLSearchParams({
    client_id: config.googleClientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
  });
  return `${AUTH_URL}?${params}`;
}

export type GoogleProfile = {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

export async function exchangeCode(code: string, redirectUri: string): Promise<GoogleProfile> {
  const tokenRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.googleClientId,
      client_secret: config.googleClientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
    cache: 'no-store',
  });

  if (!tokenRes.ok) {
    throw new Error('구글 인증에 실패했습니다. 잠시 후 다시 시도해주세요.');
  }
  const token = (await tokenRes.json()) as { access_token?: string };
  if (!token.access_token) throw new Error('구글 토큰을 받지 못했습니다.');

  const infoRes = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${token.access_token}` },
    cache: 'no-store',
  });
  if (!infoRes.ok) throw new Error('구글 프로필을 불러오지 못했습니다.');

  const profile = (await infoRes.json()) as GoogleProfile;
  if (!profile.email) throw new Error('구글 계정에 이메일이 없습니다.');
  return profile;
}
