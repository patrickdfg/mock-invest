import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { config } from './config';
import { prisma } from './db';

const COOKIE = 'mi_session';
const key = new TextEncoder().encode(config.jwtSecret);

export type SessionPayload = { uid: string; email: string; name: string; role: string };

export async function signSession(p: SessionPayload) {
  return new SignJWT({ ...p })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(key);
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

/** 세션 + DB 사용자까지 확인. 없으면 null */
export async function getCurrentUser() {
  const s = await getSession();
  if (!s) return null;
  return prisma.user.findUnique({ where: { id: s.uid } });
}

export const SESSION_COOKIE = COOKIE;
