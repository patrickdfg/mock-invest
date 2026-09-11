/**
 * 최초 1회 환경 준비 스크립트.
 *   npm run setup
 *
 * - .env 가 없으면 .env.example 을 복사하고
 * - JWT_SECRET 을 안전한 랜덤 값으로 자동 생성해 채운다
 * - 이미 .env 가 있으면 건드리지 않는다 (덮어쓰기 사고 방지)
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

const ENV = '.env';
const EXAMPLE = '.env.example';

if (existsSync(ENV)) {
  console.log('.env 가 이미 있습니다. 그대로 둡니다.');
  process.exit(0);
}

if (!existsSync(EXAMPLE)) {
  console.error(`${EXAMPLE} 을 찾을 수 없습니다. 저장소 루트에서 실행하세요.`);
  process.exit(1);
}

const secret = randomBytes(32).toString('base64');
const body = readFileSync(EXAMPLE, 'utf8').replace(
  /JWT_SECRET="[^"]*"/,
  `JWT_SECRET="${secret}"`
);

writeFileSync(ENV, body, 'utf8');

console.log('.env 생성 완료. JWT_SECRET 은 자동 생성했습니다.');
console.log('');
console.log('이어서 할 일:');
console.log('  1) Neon(https://neon.tech)에서 무료 DB를 만들고');
console.log('     연결 주소를 .env 의 DATABASE_URL / DIRECT_URL 에 붙여넣기');
console.log('  2) .env 의 INVITE_CODE 를 친구들에게 알려줄 코드로 바꾸기');
console.log('  3) .env 의 ADMIN_EMAILS 에 본인 이메일 넣기 (관리자 권한)');
console.log('  4) npm run db:deploy   # 테이블 생성');
console.log('  5) npm run dev');
