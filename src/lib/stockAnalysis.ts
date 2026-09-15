import type { Candle } from './market';

/**
 * API 키 없이 동작하는 종목 분석 (규칙 기반).
 *
 * 실제 일봉 종가(최대 1년)로 이동평균·RSI·변동성·최대낙폭·52주 위치를 계산하고,
 * 그 숫자를 근거로 문장을 만든다. 외부 AI 호출이 없어 비용·지연·키가 필요 없다.
 * 매수/매도 권유가 아니라 "지금 이 종목이 어떤 상태인지 읽는 법"을 가르치는 용도다.
 */

export type Tone = 'up' | 'down' | 'neutral';

export type StockAnalysis = {
  headline: string;
  summary: string;
  temperature: { score: number; label: string };
  metrics: { label: string; value: string; hint: string; tone: Tone }[];
  signals: { title: string; detail: string; tone: Tone }[];
  checkpoints: string[];
  lesson: { concept: string; explanation: string };
  basis: string;
};

const avg = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
const sma = (c: number[], n: number) => (c.length >= n ? avg(c.slice(-n)) : null);
const pctChange = (c: number[], back: number) =>
  c.length > back ? ((c[c.length - 1] - c[c.length - 1 - back]) / c[c.length - 1 - back]) * 100 : null;
const f1 = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
const toneOf = (n: number | null, flat = 0.5): Tone =>
  n == null ? 'neutral' : n > flat ? 'up' : n < -flat ? 'down' : 'neutral';

/** Wilder 방식 RSI(14) */
function rsi(c: number[], n = 14): number | null {
  if (c.length <= n) return null;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= n; i++) {
    const d = c[i] - c[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  gain /= n;
  loss /= n;
  for (let i = n + 1; i < c.length; i++) {
    const d = c[i] - c[i - 1];
    gain = (gain * (n - 1) + Math.max(d, 0)) / n;
    loss = (loss * (n - 1) + Math.max(-d, 0)) / n;
  }
  if (loss === 0) return 100;
  return 100 - 100 / (1 + gain / loss);
}

/** 일간 수익률 표준편차 x sqrt(252) = 연 변동성(%) */
function annualVol(c: number[], lookback = 60): number | null {
  const s = c.slice(-(lookback + 1));
  if (s.length < 21) return null;
  const r: number[] = [];
  for (let i = 1; i < s.length; i++) r.push(Math.log(s[i] / s[i - 1]));
  const m = avg(r);
  const variance = avg(r.map((x) => (x - m) ** 2));
  return Math.sqrt(variance) * Math.sqrt(252) * 100;
}

/** 기간 내 최대 낙폭(%) */
function maxDrawdown(c: number[]): number {
  let peak = c[0];
  let mdd = 0;
  for (const v of c) {
    peak = Math.max(peak, v);
    mdd = Math.min(mdd, (v - peak) / peak);
  }
  return mdd * 100;
}

const krw = (n: number) => `${Math.round(n).toLocaleString('ko-KR')}원`;

export function analyzeStock(
  candles: Candle[],
  info: { name: string; price: number }
): StockAnalysis | null {
  const c = candles.map((x) => x.close).filter((v) => Number.isFinite(v) && v > 0);
  if (c.length < 30) return null;

  const p = info.price;
  const ma20 = sma(c, 20);
  const ma60 = sma(c, 60);
  const r1w = pctChange(c, 5);
  const r1m = pctChange(c, 21);
  const r3m = pctChange(c, 63);
  const rsi14 = rsi(c);
  const vol = annualVol(c);
  const hi = Math.max(...c, p);
  const lo = Math.min(...c, p);
  const pos = hi > lo ? ((p - lo) / (hi - lo)) * 100 : 50;
  const fromHigh = ((p - hi) / hi) * 100;
  const mdd = maxDrawdown(c);
  const period = c.length >= 230 ? '1년' : `${Math.max(1, Math.round(c.length / 21))}개월`;

  const aboveMa20 = ma20 != null && p >= ma20;
  const goldenOrder = ma20 != null && ma60 != null && ma20 >= ma60;
  const trend =
    ma20 == null || ma60 == null
      ? '방향 탐색'
      : aboveMa20 && goldenOrder
        ? '상승 추세'
        : !aboveMa20 && !goldenOrder
          ? '하락 추세'
          : '방향 탐색';

  // 온도: 추세·최근 흐름·RSI·구간 위치를 합친 "지금 얼마나 뜨거운가" 지표 (매수 신호 아님)
  let t = 50;
  if (ma20 != null) t += aboveMa20 ? 8 : -8;
  if (ma20 != null && ma60 != null) t += goldenOrder ? 8 : -8;
  if (r1m != null) t += Math.max(-15, Math.min(15, r1m * 1.2));
  if (rsi14 != null) t += rsi14 >= 70 ? 6 : rsi14 <= 30 ? -6 : 0;
  t += (pos - 50) * 0.2;
  const score = Math.round(Math.max(0, Math.min(100, t)));
  const label =
    score >= 75 ? '뜨거움 🔥' : score >= 58 ? '따뜻함' : score >= 42 ? '보통' : score >= 25 ? '쌀쌀함' : '차가움 🧊';

  const volWord =
    vol == null ? '' : vol >= 50 ? '매우 큰 편이에요' : vol >= 30 ? '큰 편이에요' : vol >= 20 ? '보통 수준이에요' : '안정적인 편이에요';

  const signals: StockAnalysis['signals'] = [];
  if (ma20 != null) {
    signals.push({
      title: trend,
      tone: trend === '상승 추세' ? 'up' : trend === '하락 추세' ? 'down' : 'neutral',
      detail:
        `현재가 ${krw(p)}이 20일 평균(${krw(ma20)})보다 ${aboveMa20 ? '위' : '아래'}에 있어요.` +
        (ma60 != null
          ? ` 20일 평균선이 60일 평균선(${krw(ma60)})보다 ${goldenOrder ? '위라서 단기 흐름이 중기보다 강해요' : '아래라서 단기 흐름이 중기보다 약해요'}.`
          : ''),
    });
  }
  if (rsi14 != null) {
    signals.push(
      rsi14 >= 70
        ? { title: `RSI ${rsi14.toFixed(0)} · 과열권`, tone: 'up', detail: '짧은 기간에 많이 올라서 숨 고르기(조정)가 나올 수 있는 구간이에요.' }
        : rsi14 <= 30
          ? { title: `RSI ${rsi14.toFixed(0)} · 침체권`, tone: 'down', detail: '짧은 기간에 많이 내려서 반등이 나오기도 하지만, 하락이 더 이어지기도 해요.' }
          : { title: `RSI ${rsi14.toFixed(0)} · 중립`, tone: 'neutral', detail: '오르는 힘과 내리는 힘이 크게 치우치지 않은 상태예요.' }
    );
  }
  signals.push({
    title: pos >= 90 ? `${period} 고점 근처` : pos <= 10 ? `${period} 저점 근처` : `${period} 구간의 ${pos.toFixed(0)}% 위치`,
    tone: pos >= 60 ? 'up' : pos <= 40 ? 'down' : 'neutral',
    detail: `${period} 최고가 ${krw(hi)} 대비 ${fromHigh.toFixed(1)}%, 최저가 ${krw(lo)}보다 ${(((p - lo) / lo) * 100).toFixed(1)}% 높은 곳에 있어요.`,
  });
  if (vol != null) {
    signals.push({
      title: `변동성 연 ${vol.toFixed(0)}%`,
      tone: 'neutral',
      detail: `최근 3개월 하루 움직임으로 계산하면 1년에 위아래로 약 ${vol.toFixed(0)}% 흔들릴 수 있는 종목이에요. ${volWord}.`,
    });
  }
  if (mdd <= -30) {
    signals.push({
      title: `최대 낙폭 ${mdd.toFixed(0)}%`,
      tone: 'down',
      detail: `${period} 동안 고점에서 ${Math.abs(mdd).toFixed(0)}%까지 떨어진 적이 있어요. 이런 하락을 버틸 수 있는지 생각해봐야 해요.`,
    });
  }

  const metrics: StockAnalysis['metrics'] = [];
  const pushRet = (label: string, v: number | null, hint: string) =>
    v != null && metrics.push({ label, value: f1(v), hint, tone: toneOf(v) });
  pushRet('1주 수익률', r1w, '최근 5거래일');
  pushRet('1개월 수익률', r1m, '최근 21거래일');
  pushRet('3개월 수익률', r3m, '최근 63거래일');
  if (rsi14 != null) {
    metrics.push({
      label: 'RSI(14)',
      value: rsi14.toFixed(0),
      hint: '70↑ 과열 · 30↓ 침체',
      tone: rsi14 >= 70 ? 'up' : rsi14 <= 30 ? 'down' : 'neutral',
    });
  }
  if (vol != null) metrics.push({ label: '연 변동성', value: `${vol.toFixed(0)}%`, hint: '클수록 크게 흔들림', tone: 'neutral' });
  metrics.push({ label: `${period} 고점 대비`, value: `${fromHigh.toFixed(1)}%`, hint: `최대 낙폭 ${mdd.toFixed(0)}%`, tone: toneOf(fromHigh + 5) });

  const checkpoints = uniqStrings([
    vol != null && vol >= 40 ? '크게 흔들리는 종목이라 한 번에 많이 사기보다 나눠서 사는 연습을 해보세요.' : '',
    pos >= 85 ? '고점 근처예요. 왜 올랐는지 뉴스와 실적을 먼저 확인하고, 추격 매수인지 스스로 점검해보세요.' : '',
    trend === '하락 추세' ? '하락 추세에서는 "싸 보인다"만으로 판단하지 말고, 추세가 바뀌는 신호를 기다려보는 것도 방법이에요.' : '',
    rsi14 != null && rsi14 >= 70 ? 'RSI 과열권에서는 단기 조정이 자주 나와요. 산다면 조정 시 대응 계획을 먼저 세워두세요.' : '',
    rsi14 != null && rsi14 <= 30 ? '침체권이라고 바로 반등하는 건 아니에요. 떨어진 이유가 일시적인지 먼저 알아보세요.' : '',
    '사기 전에 "몇 % 떨어지면 판다"는 나만의 기준을 먼저 적어두세요.',
    '이 종목이 내 계좌에서 30% 이상을 차지하지 않도록 비중을 조절해보세요.',
  ]).slice(0, 3);

  const lesson =
    rsi14 != null && (rsi14 >= 70 || rsi14 <= 30)
      ? { concept: 'RSI(상대강도지수)', explanation: '최근 14일 동안 오른 폭과 내린 폭을 비교한 0~100 숫자예요. 70을 넘으면 많이 올라 과열, 30 아래면 많이 내려 침체로 봐요. 방향을 예측하는 도구가 아니라 "지금 얼마나 쏠렸나"를 보는 온도계예요.' }
      : vol != null && vol >= 40
        ? { concept: '변동성', explanation: '주가가 얼마나 크게 오르내리는지를 나타내요. 변동성이 크면 수익 기회도 크지만 손실도 커질 수 있어서, 이런 종목일수록 비중을 작게 가져가는 게 기본이에요.' }
        : ma20 != null
          ? { concept: '이동평균선', explanation: '최근 N일 종가의 평균을 이은 선이에요. 현재가가 20일선 위에 있으면 최근 한 달 산 사람들이 대체로 이익, 아래면 손실 중이라는 뜻이라 흐름을 읽는 기준으로 써요.' }
          : { concept: '52주 최고·최저가', explanation: '지난 1년 동안의 가장 높은·낮은 가격이에요. 지금 가격이 그 사이 어디쯤인지 보면 비싸게 사는지, 많이 떨어진 곳에서 사는지 감을 잡을 수 있어요.' };

  const headline = `${info.name} · ${trend} · 온도 ${label}`;
  const summary =
    (r1m != null ? `최근 1개월 ${f1(r1m)}` : '최근 흐름') +
    (r3m != null ? `, 3개월 ${f1(r3m)} 움직였고` : ' 기준으로') +
    ` ${period} 최고가 대비 ${fromHigh.toFixed(1)}% 위치예요.` +
    (vol != null ? ` 변동성은 연 ${vol.toFixed(0)}% 수준으로 ${volWord}.` : '');

  return {
    headline,
    summary,
    temperature: { score, label },
    metrics,
    signals: signals.slice(0, 5),
    checkpoints,
    lesson,
    basis: `${period} 일봉 ${c.length}개 종가로 계산한 규칙 기반 분석 (외부 AI 미사용)`,
  };
}

function uniqStrings(a: string[]) {
  return [...new Set(a.filter(Boolean))];
}
