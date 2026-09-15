import Anthropic from '@anthropic-ai/sdk';
import type { Prisma } from '@prisma/client';
import { prisma } from './db';
import { getPortfolio, settlePending } from './trade';
import { getRanking } from './ranking';
import { HttpError } from './api';
import {
  AI_SYSTEM_PROMPT,
  DIAGNOSIS_JSON_SCHEMA,
  DiagnosisSchema,
  gradeOf,
  type Diagnosis,
} from './aiPrompt';
import { diagnoseByRules } from './portfolioRules';

export const AI_MODEL = 'claude-opus-5';
/** 규칙 기반 진단 결과의 model 표기 */
export const RULE_ENGINE = 'rule-engine';

/** 비용 통제: 하루(최근 24시간) 3회, 연속 요청 사이 10분 */
export const AI_LIMITS = { perDay: 3, cooldownMinutes: 10 };

export function isAiEnabled() {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

const won = (n: number) => Math.round(n);
const fixed = (n: number, d = 1) => Number(n.toFixed(d));

/** 모델에 보낼 계좌 스냅샷. 이름·이메일 같은 개인정보는 넣지 않는다 */
async function buildSnapshot(userId: string) {
  await settlePending(userId);
  const [pf, user, orders, ranking] = await Promise.all([
    getPortfolio(userId),
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { createdAt: true } }),
    prisma.order.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 80 }),
    getRanking(),
  ]);

  const filled = orders.filter((o) => o.status === 'FILLED');
  const weekAgo = Date.now() - 7 * 864e5;
  const me = ranking.find((r) => r.userId === userId);

  return {
    계좌: {
      시작자금: won(pf.seedCash),
      총자산: won(pf.totalValue),
      예수금: won(pf.cash),
      현금비중퍼센트: pf.totalValue > 0 ? fixed((pf.cash / pf.totalValue) * 100) : 100,
      총수익률퍼센트: fixed(pf.totalPnlPct, 2),
      오늘손익: won(pf.dayPnl),
      참여일수: Math.max(1, Math.ceil((Date.now() - user.createdAt.getTime()) / 864e5)),
      리그순위: me ? `${me.rank}위 / ${ranking.length}명` : null,
    },
    보유종목: pf.rows.map((r) => ({
      종목: r.name,
      시장: r.market === 'KR' ? '국내' : '해외',
      수량: r.quantity,
      평균단가: won(r.avgPrice),
      현재가: won(r.price),
      수익률퍼센트: fixed(r.pnlPct, 2),
      비중퍼센트: fixed(r.weight),
    })),
    매매통계: {
      전체체결: filled.length,
      최근7일체결: filled.filter((o) => o.createdAt.getTime() >= weekAgo).length,
      취소주문: orders.filter((o) => o.status === 'CANCELED').length,
      누적수수료와세금: won(filled.reduce((a, o) => a + o.fee + o.tax, 0)),
      누적실현손익: won(filled.reduce((a, o) => a + (o.realizedPnl ?? 0), 0)),
    },
    최근체결: filled.slice(0, 30).map((o) => ({
      날짜: (o.filledAt ?? o.createdAt).toISOString().slice(0, 10),
      구분: o.side === 'BUY' ? '매수' : '매도',
      종목: o.name,
      수량: o.quantity,
      체결가: won(o.filledPrice ?? 0),
      실현손익: o.realizedPnl == null ? null : won(o.realizedPnl),
    })),
  };
}

export async function getQuota(userId: string) {
  const recent = await prisma.aiDiagnosis.findMany({
    // 규칙 엔진 결과는 비용이 없으므로 횟수 제한에서 뺀다
    where: { userId, model: { not: RULE_ENGINE }, createdAt: { gte: new Date(Date.now() - 864e5) } },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });
  const last = recent[0]?.createdAt;
  const readyAt = last ? last.getTime() + AI_LIMITS.cooldownMinutes * 60_000 : 0;
  return {
    used: recent.length,
    remaining: Math.max(0, AI_LIMITS.perDay - recent.length),
    cooldownUntil: readyAt > Date.now() ? new Date(readyAt).toISOString() : null,
  };
}

export async function latestDiagnosis(userId: string) {
  const row = await prisma.aiDiagnosis.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  if (!row) return null;
  return { id: row.id, createdAt: row.createdAt, model: row.model, result: row.result as Diagnosis };
}

/** 진단 실행: 쿼터 확인 -> 스냅샷 -> Claude 호출 -> 검증 -> 저장 */
export async function runDiagnosis(userId: string) {
  // 키가 없으면 API 없이 도는 규칙 엔진으로 진단한다
  if (!isAiEnabled()) return runRuleDiagnosis(userId);

  const quota = await getQuota(userId);
  if (quota.remaining <= 0) {
    throw new HttpError(
      `AI 진단은 하루 ${AI_LIMITS.perDay}번까지 받을 수 있어요. 내일 다시 시도해주세요.`,
      429
    );
  }
  if (quota.cooldownUntil) {
    const mins = Math.ceil((new Date(quota.cooldownUntil).getTime() - Date.now()) / 60_000);
    throw new HttpError(`방금 진단을 받았어요. ${mins}분 뒤에 다시 받을 수 있어요.`, 429);
  }

  const snapshot = await buildSnapshot(userId);
  const client = new Anthropic();

  let response;
  try {
    response = await client.beta.messages.create({
      model: AI_MODEL,
      max_tokens: 16000,
      // 안전 분류기가 드물게 거절하면 서버가 권장 모델로 자동 재시도한다
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: {
        // 요약형 리포트라 medium 으로 충분하고, 서버리스 응답 시간도 줄어든다
        effort: 'medium',
        format: { type: 'json_schema', schema: DIAGNOSIS_JSON_SCHEMA },
      },
      system: AI_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `아래는 학생의 모의투자 계좌 스냅샷입니다. 진단해주세요.\n\n${JSON.stringify(snapshot, null, 2)}`,
        },
      ],
    });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) {
      throw new HttpError('지금 AI 요청이 몰려 있어요. 잠시 후 다시 시도해주세요.', 429);
    }
    if (e instanceof Anthropic.AuthenticationError) {
      throw new HttpError('AI 키 설정에 문제가 있습니다. 관리자에게 알려주세요.', 503);
    }
    if (e instanceof Anthropic.APIError) {
      console.error('[ai] api error', e.status, e.message);
      throw new HttpError('AI 서버에서 오류가 났어요. 잠시 후 다시 시도해주세요.', 502);
    }
    throw e;
  }

  if (response.stop_reason === 'refusal') {
    throw new HttpError('AI가 이번 요청에는 답하지 않았어요. 다시 시도해주세요.', 502);
  }
  if (response.stop_reason === 'max_tokens') {
    throw new HttpError('AI 응답이 길어져 끊겼어요. 다시 시도해주세요.', 502);
  }

  const text = response.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
  let parsed: ReturnType<typeof DiagnosisSchema.safeParse> | null = null;
  try {
    parsed = DiagnosisSchema.safeParse(JSON.parse(text));
  } catch {
    parsed = null;
  }
  if (!parsed?.success) {
    console.error('[ai] unparseable response', text.slice(0, 500));
    throw new HttpError('AI 응답을 읽지 못했어요. 다시 시도해주세요.', 502);
  }

  const score = Math.max(0, Math.min(100, Math.round(parsed.data.score)));
  const result: Diagnosis = { ...parsed.data, score, grade: gradeOf(score) };

  const saved = await prisma.aiDiagnosis.create({
    data: {
      userId,
      model: response.model,
      score,
      result: result as unknown as Prisma.InputJsonValue,
    },
  });

  return { id: saved.id, createdAt: saved.createdAt, model: saved.model, result };
}

/** API 키 없이 규칙으로 진단. 즉시 끝나고 비용·횟수 제한이 없다 */
async function runRuleDiagnosis(userId: string) {
  await settlePending(userId);
  const [pf, user, orders] = await Promise.all([
    getPortfolio(userId),
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { createdAt: true } }),
    prisma.order.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 300 }),
  ]);

  const body = diagnoseByRules({
    cash: pf.cash,
    totalValue: pf.totalValue,
    seedCash: pf.seedCash,
    totalPnlPct: pf.totalPnlPct,
    rows: pf.rows.map((r) => ({ name: r.name, market: r.market, pnlPct: r.pnlPct, weight: r.weight })),
    filled: orders
      .filter((o) => o.status === 'FILLED')
      .map((o) => ({
        createdAt: o.filledAt ?? o.createdAt,
        side: o.side,
        fee: o.fee,
        tax: o.tax,
        realizedPnl: o.realizedPnl,
      })),
    canceled: orders.filter((o) => o.status === 'CANCELED').length,
    ageDays: Math.max(1, Math.ceil((Date.now() - user.createdAt.getTime()) / 864e5)),
  });

  const score = Math.max(0, Math.min(100, Math.round(body.score)));
  const result: Diagnosis = { ...body, score, grade: gradeOf(score) };
  const saved = await prisma.aiDiagnosis.create({
    data: { userId, model: RULE_ENGINE, score, result: result as unknown as Prisma.InputJsonValue },
  });
  return { id: saved.id, createdAt: saved.createdAt, model: saved.model, result };
}
