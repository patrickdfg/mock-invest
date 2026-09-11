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
  // API, 정적파일 제외한 전 페이지에 적용
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\.(?:png|jpg|svg|ico|webmanifest)$).*)'],
};
