import type { DiagnosisBody } from './aiPrompt';

/**
 * API 키 없이 동작하는 계좌 진단 (규칙 기반).
 * Claude 진단과 같은 DiagnosisBody 형태를 돌려주므로 화면은 그대로 재사용한다.
 * ANTHROPIC_API_KEY 가 없을 때 자동으로 이 엔진이 쓰인다.
 */

export type RuleInput = {
  cash: number;
  totalValue: number;
  seedCash: number;
  totalPnlPct: number;
  rows: { name: string; market: string; pnlPct: number; weight: number }[];
  filled: { createdAt: Date; side: string; fee: number; tax: number; realizedPnl: number | null }[];
  canceled: number;
  ageDays: number;
};

type Risk = DiagnosisBody['risks'][number];

const LESSONS = {
  분산투자:
    '한 바구니에 달걀을 다 담지 않는 것. 여러 종목·업종·나라에 나눠 담으면 하나가 크게 떨어져도 계좌 전체는 덜 흔들려요.',
  현금비중:
    '현금도 하나의 자산이에요. 적당한 현금은 급락 때 싸게 살 기회를 주지만, 너무 많으면 시장이 올라도 내 계좌는 제자리예요.',
  손절기준:
    '사기 전에 "몇 % 떨어지면 판다"를 정해두는 것. 기준이 없으면 손실이 커질수록 "언젠가 오르겠지"에 기대게 돼요.',
  거래비용:
    '사고팔 때마다 수수료와 세금이 나가요. 자주 매매할수록 수익률이 조금씩 깎이는데, 모이면 생각보다 커요.',
  환율:
    '해외 주식은 주가뿐 아니라 환율도 수익에 영향을 줘요. 주가가 그대로여도 원·달러 환율이 오르면 원화 평가액이 올라가요.',
  장기투자:
    '좋은 기업을 오래 들고 가면 매일의 등락보다 기업이 성장하는 속도가 수익을 결정해요.',
} as const;
type LessonKey = keyof typeof LESSONS;

const LEVEL_ORDER: Record<Risk['level'], number> = { 높음: 0, 보통: 1, 낮음: 2 };
const money = (n: number) => `${Math.round(n).toLocaleString('ko-KR')}원`;
const pct1 = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;

function uniq<T>(a: T[]) {
  return [...new Set(a)];
}

export function diagnoseByRules(i: RuleInput): DiagnosisBody {
  const n = i.rows.length;
  const cashPct = i.totalValue > 0 ? (i.cash / i.totalValue) * 100 : 100;
  const top = [...i.rows].sort((a, b) => b.weight - a.weight)[0];
  const weekAgo = Date.now() - 7 * 864e5;
  const trades7 = i.filled.filter((o) => o.createdAt.getTime() >= weekAgo).length;
  const perDay = i.filled.length / i.ageDays;
  const costs = i.filled.reduce((a, o) => a + o.fee + o.tax, 0);
  const costPct = i.seedCash > 0 ? (costs / i.seedCash) * 100 : 0;
  const sells = i.filled.filter((o) => o.side === 'SELL');
  const realized = sells.reduce((a, o) => a + (o.realizedPnl ?? 0), 0);
  const losers = i.rows.filter((r) => r.pnlPct <= -15);
  const kr = i.rows.filter((r) => r.market === 'KR').length;

  // 아직 보유 종목이 없는 경우
  if (n === 0) {
    const traded = i.filled.length > 0;
    return {
      score: traded ? 50 : 55,
      headline: traded ? '지금은 전부 현금으로 쉬는 중이에요' : '아직 첫 투자 전이에요',
      summary: traded
        ? `매매 ${i.filled.length}건 뒤 모두 팔아 현금 ${money(i.cash)}을 들고 있어요. 총수익률은 ${pct1(i.totalPnlPct)}예요. 쉬는 것도 전략이지만, 다음에 무엇을 살지 기준을 세워둘 때예요.`
        : `시작 자금 ${money(i.seedCash)}이 그대로 현금으로 있어요. 잃은 것도 없지만 아직 배운 것도 없어요. 작게 한 종목부터 사보며 시작해보세요.`,
      strengths: traded
        ? ['매도까지 해보며 한 사이클을 경험했어요.', '현금을 지켜서 다음 기회를 고를 여유가 있어요.']
        : ['급하게 사지 않고 신중하게 시작하려는 자세예요.', '아직 손실이 없어 원금이 온전해요.'],
      risks: [
        {
          title: '투자 경험 부족',
          detail: '실제로 사고팔아봐야 가격이 움직일 때의 내 감정과 습관을 알 수 있어요.',
          level: '낮음',
        },
      ],
      habits: [
        `리그 참여 ${i.ageDays}일째, 체결된 주문은 ${i.filled.length}건이에요.`,
        i.canceled > 0 ? `취소된 주문이 ${i.canceled}건 있어요. 주문 전 조건을 한 번 더 확인해보세요.` : '아직 취소한 주문이 없어요.',
      ],
      lessons: [
        { concept: '분산투자', explanation: LESSONS.분산투자 },
        { concept: '손절기준', explanation: LESSONS.손절기준 },
      ],
      nextSteps: [
        '시작 자금의 10~20%로 잘 아는 회사 주식 하나를 사보기',
        '산 이유를 한 줄로 메모해두기',
        '"몇 % 떨어지면 판다"는 기준을 미리 정하기',
      ],
    };
  }

  let score = 60;
  const strengths: string[] = [];
  const risks: Risk[] = [];
  const habits: string[] = [];
  const lessonKeys: LessonKey[] = [];
  const steps: string[] = [];
  const w = top.weight.toFixed(0);

  // 1) 종목 수
  if (n === 1) {
    score -= 15;
    risks.push({ title: '한 종목에 몰빵', detail: `보유 종목이 ${top.name} 하나뿐이에요. 이 종목이 10% 떨어지면 주식 자산 전체가 10% 줄어요.`, level: '높음' });
    lessonKeys.push('분산투자');
    steps.push('업종이 다른 종목을 1~2개 더 담아 위험을 나눠보기');
  } else if (n === 2) {
    score -= 5;
    risks.push({ title: '종목 수가 적음', detail: `보유 종목이 ${n}개라 한 종목의 움직임이 계좌 전체를 크게 흔들어요.`, level: '보통' });
    lessonKeys.push('분산투자');
  } else if (n >= 5) {
    score += 10;
    strengths.push(`${n}개 종목에 나눠 담아 한 종목이 흔들려도 버틸 수 있는 구조예요.`);
  } else {
    score += 5;
    strengths.push(`${n}개 종목으로 분산을 시작했어요.`);
  }

  // 2) 쏠림 (1종목이면 위에서 이미 위험으로 알렸으니 점수만 더 깎는다)
  if (n === 1 && top.weight > 50) {
    score -= 12;
    steps.push(`${top.name} 비중을 총자산의 30% 이하로 줄이는 방법을 생각해보기`);
  }
  if (n >= 2) {
    if (top.weight > 50) {
      score -= 12;
      risks.push({ title: '비중 쏠림', detail: `${top.name} 비중이 총자산의 ${w}%예요. 종목 수는 여러 개여도 사실상 한 종목에 기대고 있어요.`, level: '높음' });
      lessonKeys.push('분산투자');
      steps.push(`${top.name} 비중을 30% 이하로 줄이는 방법을 생각해보기`);
    } else if (top.weight > 30) {
      score -= 6;
      risks.push({ title: '비중 쏠림 주의', detail: `가장 큰 종목(${top.name}) 비중이 총자산의 ${w}%예요.`, level: '보통' });
    } else {
      score += 5;
      strengths.push(`가장 큰 종목(${top.name})도 총자산의 ${w}%라 쏠림이 크지 않아요.`);
    }
  }

  // 3) 현금 비중
  if (cashPct > 80) {
    score -= 5;
    risks.push({ title: '현금이 너무 많음', detail: `총자산의 ${cashPct.toFixed(0)}%가 현금이에요. 안전하지만 시장이 올라도 계좌는 거의 그대로예요.`, level: '낮음' });
    lessonKeys.push('현금비중');
  } else if (cashPct < 5) {
    score -= 8;
    risks.push({ title: '현금 여유 없음', detail: `현금이 총자산의 ${cashPct.toFixed(1)}%뿐이라 급락해도 추가로 살 여력이 없어요.`, level: '보통' });
    lessonKeys.push('현금비중');
    steps.push('총자산의 10~20%는 현금으로 남겨두는 규칙 만들기');
  } else if (cashPct >= 10 && cashPct <= 50) {
    score += 5;
    strengths.push(`현금을 ${cashPct.toFixed(0)}% 남겨 급락이 와도 대응할 여유가 있어요.`);
  }

  // 4) 큰 손실 방치
  if (losers.length) {
    const worst = [...losers].sort((a, b) => a.pnlPct - b.pnlPct)[0];
    score -= 8;
    risks.push({
      title: '큰 손실 종목 보유',
      detail: `15% 넘게 손실 중인 종목: ${losers.map((r) => `${r.name}(${r.pnlPct.toFixed(1)}%)`).join(', ')}.`,
      level: worst.pnlPct <= -30 ? '높음' : '보통',
    });
    lessonKeys.push('손절기준');
    steps.push(`${worst.name}: 처음 산 이유가 아직 유효한지 다시 점검해보기`);
  }

  // 5) 매매 빈도와 비용
  if (trades7 >= 15 || perDay >= 3) {
    score -= 10;
    habits.push(`최근 7일 동안 ${trades7}번 체결했어요. 자주 사고팔수록 판단보다 기분에 따라 움직이기 쉬워요.`);
    risks.push({ title: '잦은 매매', detail: `하루 평균 ${perDay.toFixed(1)}건 매매 중이에요. 수수료·세금이 쌓여 수익을 갉아먹어요.`, level: '보통' });
    lessonKeys.push('거래비용');
    steps.push('매매하기 전 "왜 지금 사는지/파는지" 한 줄로 적어보기');
  } else if (i.filled.length > 0) {
    score += 5;
    habits.push(`매매 ${i.filled.length}건, 최근 7일 ${trades7}건으로 차분하게 거래하고 있어요.`);
  }
  if (costPct >= 0.5) {
    score -= 5;
    risks.push({ title: '거래 비용 누적', detail: `지금까지 수수료와 세금으로 ${money(costs)}(시작 자금의 ${costPct.toFixed(2)}%)이 나갔어요.`, level: '낮음' });
    lessonKeys.push('거래비용');
  }

  // 6) 실현 손익
  if (sells.length && realized > 0) {
    score += 3;
    strengths.push(`팔아서 확정한 이익이 ${money(realized)}이에요. 수익을 실제로 챙기는 경험을 했어요.`);
  } else if (sells.length && realized < 0) {
    habits.push(`매도로 확정한 손실이 ${money(Math.abs(realized))}이에요. 손실을 끊어낸 것도 중요한 경험이에요.`);
  } else if (!sells.length && i.filled.length >= 3) {
    habits.push('사기만 하고 아직 판 적이 없어요. 언제 팔지(목표가·손절가)도 살 때 같이 정해보세요.');
    lessonKeys.push('손절기준');
  }

  // 7) 국내/해외 편중
  if (n >= 3 && (kr === 0 || kr === n)) {
    score -= 3;
    habits.push(`보유 종목이 모두 ${kr === n ? '국내' : '해외'} 주식이에요. 한 나라 시장 분위기에 계좌 전체가 같이 움직여요.`);
    lessonKeys.push(kr === n ? '분산투자' : '환율');
  } else if (kr > 0 && kr < n) {
    strengths.push('국내와 해외 주식을 함께 담아 나라별로도 나눠 투자하고 있어요.');
    lessonKeys.push('환율');
  }

  // ---- 분량 맞추기 (Claude 진단과 같은 형태) ----
  const fillStrengths = [
    `리그에 ${i.ageDays}일째 참여하며 직접 매매해보고 있어요.`,
    '아직 무리한 레버리지나 극단적인 매매는 보이지 않아요.',
  ];
  const finalStrengths = uniq([...strengths, ...fillStrengths]).slice(0, 3);

  if (!risks.length) {
    risks.push({ title: '시장 전체 하락', detail: '지금 계좌에 큰 약점은 없지만, 시장 전체가 떨어지면 대부분의 종목이 같이 내려갈 수 있어요.', level: '낮음' });
  }
  const finalRisks = risks.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]).slice(0, 3);

  const finalHabits = uniq([
    ...habits,
    `총수익률은 ${pct1(i.totalPnlPct)}예요. 수익률보다 원칙을 지켰는지를 먼저 돌아보세요.`,
    i.canceled > 0 ? `취소된 주문이 ${i.canceled}건 있어요.` : '주문을 취소한 적 없이 계획대로 체결했어요.',
  ]).slice(0, 3);

  const keys = uniq<LessonKey>([...lessonKeys, '분산투자', '장기투자']).slice(0, 2);
  const lessons = keys.map((k) => ({ concept: k, explanation: LESSONS[k] }));

  // 이미 비중 줄이기 제안이 있으면 같은 말을 반복하지 않는다
  const hasWeightStep = steps.some((x) => x.includes('30%'));
  const nextSteps = uniq([
    ...steps,
    hasWeightStep ? '업종이 다른 종목을 관심종목에 담아 움직임을 비교해보기' : '한 종목 비중을 총자산의 30% 이하로 유지하는 규칙 정하기',
    '매수할 때 "몇 % 떨어지면 판다" 기준을 메모해두기',
    '일주일에 한 번 AI 진단으로 내 습관이 달라졌는지 확인하기',
  ]).slice(0, 3);

  score = Math.max(0, Math.min(100, Math.round(score)));
  const worstRisk = finalRisks[0];
  const headline =
    score >= 75
      ? '균형 잡힌 포트폴리오를 만들고 있어요'
      : worstRisk.level === '높음'
        ? `먼저 챙길 점: ${worstRisk.title}`
        : '기본기는 갖췄고, 다듬을 곳이 조금 있어요';

  const summary =
    `보유 ${n}종목, 현금 비중 ${cashPct.toFixed(0)}%, 총수익률 ${pct1(i.totalPnlPct)}예요. ` +
    `가장 큰 종목은 ${top.name}(${w}%)이고, 지금까지 ${i.filled.length}건 매매했어요. ` +
    (score >= 60 ? '큰 틀은 괜찮으니 아래 주의할 점만 다듬어보세요.' : '점수를 깎은 원인이 아래에 있으니 하나씩 고쳐보세요.');

  return {
    score,
    headline,
    summary,
    strengths: finalStrengths,
    risks: finalRisks,
    habits: finalHabits,
    lessons,
    nextSteps,
  };
}
