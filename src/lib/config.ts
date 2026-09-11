/** 환경변수 파싱 한 곳에 모음 */

function num(v: string | undefined, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const config = {
  seedCash: num(process.env.SEED_CASH, 10_000_000),
  inviteCode: (process.env.INVITE_CODE ?? '').trim(),
  allow24h: (process.env.ALLOW_24H ?? 'true').toLowerCase() !== 'false',
  adminEmails: (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-only-insecure-secret-change-me-please-32',
};

/** 거래 비용 (실제 증권사 기준 근사치) */
export const FEES = {
  KR: { commission: 0.00015, sellTax: 0.0018 }, // 수수료 0.015%, 매도 거래세 0.18%
  US: { commission: 0.0025, sellTax: 0 }, // 수수료 0.25%
} as const;
