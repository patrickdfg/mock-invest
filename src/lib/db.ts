import { PrismaClient } from '@prisma/client';

// Next.js dev 모드 HMR에서 커넥션이 무한 증식하지 않도록 전역에 캐싱
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
