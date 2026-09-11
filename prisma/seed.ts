/**
 * 초기 관리자 계정 생성 스크립트.
 *   npx tsx prisma/seed.ts
 * 이미 있으면 아무것도 하지 않는다.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com';
const PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'admin1234';
const NAME = process.env.SEED_ADMIN_NAME ?? '관리자';
const CASH = Number(process.env.SEED_CASH ?? 10_000_000);

async function main() {
  const email = EMAIL.toLowerCase();
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    console.log(`이미 존재하는 계정: ${email}`);
    return;
  }
  await prisma.user.create({
    data: {
      email,
      name: NAME,
      password: await bcrypt.hash(PASSWORD, 10),
      role: 'ADMIN',
      cash: CASH,
      seedCash: CASH,
    },
  });
  console.log(`관리자 계정 생성 완료: ${email} / ${PASSWORD}`);
  console.log('로그인 후 반드시 비밀번호를 바꾸세요.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
