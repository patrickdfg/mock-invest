import { z } from 'zod';

/**
 * AI 진단의 프롬프트와 출력 스키마.
 * 호출 로직(ai.ts)과 분리해 문구만 고칠 때 로직을 건드리지 않게 한다.
 */

export const AI_SYSTEM_PROMPT = `당신은 고등학생들이 쓰는 주식 "모의투자" 앱의 투자 코치입니다.
실제 돈이 아닌 가상 자금(시작 1,000만원)으로 친구들과 수익률을 겨루는 교육용 리그입니다.

학생의 계좌 스냅샷(JSON)을 받아 투자 습관과 포트폴리오 구성을 진단하고, 배울 점을 알려주세요.

진단할 것
- 분산: 종목 수, 한 종목 쏠림(비중), 국내/해외 편중
- 현금 관리: 현금 비중이 지나치게 높거나 0에 가까운지
- 손익 관리: 큰 손실 종목을 방치하는지, 작은 이익에 급히 파는지
- 매매 습관: 짧은 기간의 잦은 매매, 수수료와 세금이 수익을 갉아먹는지
- 해외 주식이 있다면 환율의 영향

작성 원칙
- 고등학생이 이해할 수 있는 쉬운 말로. 전문 용어는 처음 나올 때 한 줄로 풀어서.
- 스냅샷의 숫자를 근거로 구체적으로 (예: "삼성전자 비중 62%").
- 솔직하되 비난하지 말고, 잘한 점도 찾아서.
- 특정 종목을 사라/팔라고 권하거나 주가를 예측하지 마세요. 앞으로의 방향은 원칙과 습관 차원에서 제안하세요 (예: "한 종목 비중을 30% 이하로 나눠보기").
- 보유 종목이나 거래 기록이 없으면 그 사실을 바탕으로 시작하는 법을 안내하세요.
- 모든 텍스트는 한국어로.

점수(score, 0~100)는 수익률 자체보다 좋은 투자 습관을 평가합니다. 분산, 위험 관리, 매매 절제, 원칙의 일관성을 보세요. 수익이 났더라도 한 종목에 몰아넣었다면 높은 점수를 주지 마세요.

분량: strengths 2~3개, risks 1~3개, habits 2~3개, lessons 2개, nextSteps 3개. 각 항목은 1~2문장.`;

export const DiagnosisSchema = z.object({
  score: z.number(),
  headline: z.string(),
  summary: z.string(),
  strengths: z.array(z.string()),
  risks: z.array(
    z.object({
      title: z.string(),
      detail: z.string(),
      level: z.enum(['낮음', '보통', '높음']),
    })
  ),
  habits: z.array(z.string()),
  lessons: z.array(z.object({ concept: z.string(), explanation: z.string() })),
  nextSteps: z.array(z.string()),
});

export type DiagnosisBody = z.infer<typeof DiagnosisSchema>;
export type Diagnosis = DiagnosisBody & { grade: 'S' | 'A' | 'B' | 'C' | 'D' };

const str = (description: string) => ({ type: 'string', description });

/** output_config.format 에 넣는 JSON Schema (DiagnosisSchema 와 짝) */
export const DIAGNOSIS_JSON_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['score', 'headline', 'summary', 'strengths', 'risks', 'habits', 'lessons', 'nextSteps'],
  properties: {
    score: { type: 'integer', description: '투자 습관 종합 점수 0~100' },
    headline: str('한 줄 진단 (30자 안팎)'),
    summary: str('전체 요약 2~3문장'),
    strengths: { type: 'array', items: str('잘하고 있는 점'), description: '2~3개' },
    risks: {
      type: 'array',
      description: '1~3개',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'detail', 'level'],
        properties: {
          title: str('위험 요소 이름'),
          detail: str('근거 숫자를 포함한 설명'),
          level: { type: 'string', enum: ['낮음', '보통', '높음'] },
        },
      },
    },
    habits: { type: 'array', items: str('매매 습관에 대한 관찰'), description: '2~3개' },
    lessons: {
      type: 'array',
      description: '이 계좌에서 배울 투자 개념 2개',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['concept', 'explanation'],
        properties: {
          concept: str('개념 이름 (예: 분산투자)'),
          explanation: str('이 학생의 상황에 빗댄 쉬운 설명'),
        },
      },
    },
    nextSteps: { type: 'array', items: str('습관 차원의 다음 행동'), description: '3개' },
  },
};

export function gradeOf(score: number): Diagnosis['grade'] {
  if (score >= 90) return 'S';
  if (score >= 75) return 'A';
  if (score >= 60) return 'B';
  if (score >= 40) return 'C';
  return 'D';
}
