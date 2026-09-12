import { prisma } from './db';
import { config } from './config';

/**
 * ADMIN_EMAILS 에 있는데 아직 USER 인 계정을 로그인 시점에 관리자로 올린다.
 *
 * 가입할 때만 판정하면, 이미 가입한 사람을 나중에 ADMIN_EMAILS 에 추가해도
 * 영영 관리자가 되지 않는다. 실제로 그 상황이 자주 생긴다.
 */
export async function promoteIfListed(user: { id: string; email: string; role: string }) {
  if (user.role === 'ADMIN') return user.role;
  if (!config.adminEmails.includes(user.email.toLowerCase())) return user.role;

  await prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } });
  return 'ADMIN';
}
