import { NextResponse } from 'next/server';
import { getCurrentUser } from './auth';
import { TradeError } from './trade';

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data as any, init);
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** 로그인 사용자 보장. 없으면 401을 던진다 */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new HttpError('로그인이 필요합니다.', 401);
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== 'ADMIN') throw new HttpError('관리자 권한이 필요합니다.', 403);
  return user;
}

export class HttpError extends Error {
  constructor(
    message: string,
    public status = 400
  ) {
    super(message);
  }
}

/** 라우트 핸들러 공통 래퍼: 예외를 JSON 에러로 변환 */
export function handler<T extends any[]>(fn: (...args: T) => Promise<Response>) {
  return async (...args: T): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e: any) {
      if (e instanceof HttpError) return fail(e.message, e.status);
      if (e instanceof TradeError) return fail(e.message, 400);
      console.error('[api]', e);
      return fail(e?.message ?? '서버 오류가 발생했습니다.', 500);
    }
  };
}
