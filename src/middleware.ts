import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLIC = ['/login', '/signup'];
const key = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'dev-only-insecure-secret-change-me-please-32'
);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get('mi_session')?.value;

  let valid = false;
  if (token) {
    try {
      await jwtVerify(token, key);
      valid = true;
    } catch {
      valid = false;
    }
  }

  const isPublic = PUBLIC.some((p) => pathname.startsWith(p));

  if (!valid && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  if (valid && isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // API와 정적 자산을 제외한 전 페이지에 적용.
  // sw.js / offline.html / manifest / 아이콘이 로그인으로 리다이렉트되면
  // 서비스워커 등록과 앱 설치가 통째로 실패하므로 반드시 제외한다.
  matcher: [
    '/((?!api|_next/static|_next/image|sw\.js|offline\.html|manifest\.webmanifest|icons/|favicon).*)',
  ],
};
