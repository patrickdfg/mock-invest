/**
 * 자주 쓰는 종목 프리셋.
 * Yahoo Finance 검색이 한글 질의에 약할 때가 있어 로컬 사전을 먼저 조회한다.
 * KR: 6자리코드 + .KS(코스피) / .KQ(코스닥)
 */
export type Preset = { symbol: string; name: string; market: 'KR' | 'US'; keywords: string };

export const PRESETS: Preset[] = [
  // --- 코스피 대형주 ---
  { symbol: '005930.KS', name: '삼성전자', market: 'KR', keywords: 'samsung 005930 반도체' },
  { symbol: '000660.KS', name: 'SK하이닉스', market: 'KR', keywords: 'sk hynix 000660 반도체' },
  { symbol: '373220.KS', name: 'LG에너지솔루션', market: 'KR', keywords: 'lg energy 373220 배터리' },
  { symbol: '207940.KS', name: '삼성바이오로직스', market: 'KR', keywords: 'samsung bio 207940' },
  { symbol: '005380.KS', name: '현대차', market: 'KR', keywords: 'hyundai motor 005380 자동차' },
  { symbol: '000270.KS', name: '기아', market: 'KR', keywords: 'kia 000270 자동차' },
  { symbol: '068270.KS', name: '셀트리온', market: 'KR', keywords: 'celltrion 068270 바이오' },
  { symbol: '005490.KS', name: 'POSCO홀딩스', market: 'KR', keywords: 'posco 005490 철강' },
  { symbol: '035420.KS', name: 'NAVER', market: 'KR', keywords: 'naver 네이버 035420' },
  { symbol: '035720.KS', name: '카카오', market: 'KR', keywords: 'kakao 035720' },
  { symbol: '051910.KS', name: 'LG화학', market: 'KR', keywords: 'lg chem 051910' },
  { symbol: '006400.KS', name: '삼성SDI', market: 'KR', keywords: 'samsung sdi 006400 배터리' },
  { symbol: '105560.KS', name: 'KB금융', market: 'KR', keywords: 'kb 105560 은행' },
  { symbol: '055550.KS', name: '신한지주', market: 'KR', keywords: 'shinhan 055550 은행' },
  { symbol: '012330.KS', name: '현대모비스', market: 'KR', keywords: 'mobis 012330' },
  { symbol: '015760.KS', name: '한국전력', market: 'KR', keywords: 'kepco 015760 전력' },
  { symbol: '017670.KS', name: 'SK텔레콤', market: 'KR', keywords: 'skt 017670 통신' },
  { symbol: '066570.KS', name: 'LG전자', market: 'KR', keywords: 'lg electronics 066570' },
  { symbol: '033780.KS', name: 'KT&G', market: 'KR', keywords: 'ktg 033780' },
  { symbol: '096770.KS', name: 'SK이노베이션', market: 'KR', keywords: 'sk innovation 096770' },
  { symbol: '086790.KS', name: '하나금융지주', market: 'KR', keywords: 'hana 086790 은행' },
  { symbol: '259960.KS', name: '크래프톤', market: 'KR', keywords: 'krafton 259960 게임 배그' },
  { symbol: '036570.KS', name: '엔씨소프트', market: 'KR', keywords: 'ncsoft 036570 게임' },
  { symbol: '251270.KS', name: '넷마블', market: 'KR', keywords: 'netmarble 251270 게임' },
  { symbol: '011200.KS', name: 'HMM', market: 'KR', keywords: 'hmm 011200 해운' },
  { symbol: '009540.KS', name: 'HD한국조선해양', market: 'KR', keywords: '009540 조선' },
  { symbol: '042660.KS', name: '한화오션', market: 'KR', keywords: '042660 조선' },
  { symbol: '012450.KS', name: '한화에어로스페이스', market: 'KR', keywords: '012450 방산' },
  { symbol: '047810.KS', name: '한국항공우주', market: 'KR', keywords: 'kai 047810 방산' },
  { symbol: '018260.KS', name: '삼성에스디에스', market: 'KR', keywords: 'samsung sds 018260' },
  { symbol: '316140.KS', name: '우리금융지주', market: 'KR', keywords: 'woori 316140 은행' },
  { symbol: '003670.KS', name: '포스코퓨처엠', market: 'KR', keywords: '003670 배터리' },
  { symbol: '090430.KS', name: '아모레퍼시픽', market: 'KR', keywords: 'amorepacific 090430 화장품' },
  { symbol: '271560.KS', name: '오리온', market: 'KR', keywords: 'orion 271560 과자' },
  { symbol: '097950.KS', name: 'CJ제일제당', market: 'KR', keywords: 'cj 097950 식품' },
  { symbol: '139480.KS', name: '이마트', market: 'KR', keywords: 'emart 139480' },
  { symbol: '282330.KS', name: 'BGF리테일', market: 'KR', keywords: 'cu 282330 편의점' },

  // --- 코스닥 ---
  { symbol: '247540.KQ', name: '에코프로비엠', market: 'KR', keywords: 'ecopro 247540 배터리' },
  { symbol: '086520.KQ', name: '에코프로', market: 'KR', keywords: 'ecopro 086520' },
  { symbol: '196170.KQ', name: '알테오젠', market: 'KR', keywords: '196170 바이오' },
  { symbol: '028300.KQ', name: 'HLB', market: 'KR', keywords: 'hlb 028300 바이오' },
  { symbol: '293490.KQ', name: '카카오게임즈', market: 'KR', keywords: 'kakao games 293490 게임' },
  { symbol: '112040.KQ', name: '위메이드', market: 'KR', keywords: 'wemade 112040 게임' },
  { symbol: '263750.KQ', name: '펄어비스', market: 'KR', keywords: 'pearl abyss 263750 검은사막' },
  { symbol: '357780.KQ', name: '솔브레인', market: 'KR', keywords: '357780 반도체' },
  { symbol: '058470.KQ', name: '리노공업', market: 'KR', keywords: '058470 반도체' },

  // --- 국내 ETF ---
  { symbol: '069500.KS', name: 'KODEX 200', market: 'KR', keywords: 'kodex etf 코스피200 069500' },
  { symbol: '360750.KS', name: 'TIGER 미국S&P500', market: 'KR', keywords: 'tiger etf sp500 360750' },
  { symbol: '133690.KS', name: 'TIGER 미국나스닥100', market: 'KR', keywords: 'tiger etf nasdaq 133690' },
  { symbol: '122630.KS', name: 'KODEX 레버리지', market: 'KR', keywords: 'kodex 레버리지 122630' },
  { symbol: '252670.KS', name: 'KODEX 200선물인버스2X', market: 'KR', keywords: '곱버스 인버스 252670' },

  // --- 미국 주식 ---
  { symbol: 'AAPL', name: '애플', market: 'US', keywords: 'apple aapl 아이폰' },
  { symbol: 'MSFT', name: '마이크로소프트', market: 'US', keywords: 'microsoft msft' },
  { symbol: 'NVDA', name: '엔비디아', market: 'US', keywords: 'nvidia nvda gpu' },
  { symbol: 'GOOGL', name: '알파벳(구글)', market: 'US', keywords: 'google alphabet googl' },
  { symbol: 'AMZN', name: '아마존', market: 'US', keywords: 'amazon amzn' },
  { symbol: 'META', name: '메타(페이스북)', market: 'US', keywords: 'meta facebook instagram' },
  { symbol: 'TSLA', name: '테슬라', market: 'US', keywords: 'tesla tsla 전기차' },
  { symbol: 'NFLX', name: '넷플릭스', market: 'US', keywords: 'netflix nflx' },
  { symbol: 'AMD', name: 'AMD', market: 'US', keywords: 'amd 반도체' },
  { symbol: 'COIN', name: '코인베이스', market: 'US', keywords: 'coinbase coin 코인' },
  { symbol: 'PLTR', name: '팔란티어', market: 'US', keywords: 'palantir pltr' },
  { symbol: 'AVGO', name: '브로드컴', market: 'US', keywords: 'broadcom avgo' },
  { symbol: 'DIS', name: '디즈니', market: 'US', keywords: 'disney dis' },
  { symbol: 'SBUX', name: '스타벅스', market: 'US', keywords: 'starbucks sbux' },
  { symbol: 'NKE', name: '나이키', market: 'US', keywords: 'nike nke' },
  { symbol: 'KO', name: '코카콜라', market: 'US', keywords: 'coca cola ko' },
  { symbol: 'SPY', name: 'S&P500 ETF', market: 'US', keywords: 'spy etf sp500' },
  { symbol: 'QQQ', name: '나스닥100 ETF', market: 'US', keywords: 'qqq etf nasdaq' },
  { symbol: 'TQQQ', name: '나스닥100 3배 ETF', market: 'US', keywords: 'tqqq 레버리지' },
];

const bySymbol = new Map(PRESETS.map((p) => [p.symbol.toUpperCase(), p]));

export function findPreset(symbol: string) {
  return bySymbol.get(symbol.toUpperCase());
}

/** 로컬 사전 검색. 정확도 순 정렬 */
export function searchPresets(q: string, limit = 12): Preset[] {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  return PRESETS.map((p) => {
    const name = p.name.toLowerCase();
    const sym = p.symbol.toLowerCase();
    let score = 0;
    if (sym === s || sym.split('.')[0] === s) score = 100;
    else if (name === s) score = 95;
    else if (name.startsWith(s)) score = 80;
    else if (sym.startsWith(s)) score = 70;
    else if (name.includes(s)) score = 50;
    else if (p.keywords.toLowerCase().includes(s)) score = 30;
    return { p, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.p);
}

/** 심볼 표기로 시장 추정 */
export function marketOf(symbol: string): 'KR' | 'US' {
  return /\.(KS|KQ)$/i.test(symbol) ? 'KR' : 'US';
}

/** 사용자가 "005930"처럼 코드만 입력한 경우 보정 */
export function normalizeSymbol(input: string): string {
  const s = input.trim().toUpperCase();
  if (/^\d{6}$/.test(s)) {
    const hit = PRESETS.find((p) => p.symbol.startsWith(s));
    return hit ? hit.symbol : `${s}.KS`;
  }
  return s;
}

/** 시장 구분 표기 */
export function boardOf(symbol: string): '코스피' | '코스닥' | '해외' {
  if (/\.KQ$/i.test(symbol)) return '코스닥';
  if (/\.KS$/i.test(symbol)) return '코스피';
  return '해외';
}

const ETF_PATTERN = /^(KODEX|TIGER)|ETF|^(SPY|QQQ|TQQQ|VOO)$/i;

export function isEtf(p: Preset) {
  return ETF_PATTERN.test(p.name) || ETF_PATTERN.test(p.symbol);
}

export type Category = 'ALL' | 'KOSPI' | 'KOSDAQ' | 'ETF' | 'US';

export const CATEGORIES: { key: Category; label: string }[] = [
  { key: 'ALL', label: '전체' },
  { key: 'KOSPI', label: '코스피' },
  { key: 'KOSDAQ', label: '코스닥' },
  { key: 'ETF', label: 'ETF' },
  { key: 'US', label: '해외' },
];

/** 카테고리별 종목 목록. ETF 는 국내/해외 양쪽에서 뽑는다 */
export function presetsByCategory(cat: Category): Preset[] {
  if (cat === 'ETF') return PRESETS.filter(isEtf);
  const rest = PRESETS.filter((p) => !isEtf(p));
  switch (cat) {
    case 'KOSPI':
      return rest.filter((p) => boardOf(p.symbol) === '코스피');
    case 'KOSDAQ':
      return rest.filter((p) => boardOf(p.symbol) === '코스닥');
    case 'US':
      return rest.filter((p) => p.market === 'US');
    default:
      return PRESETS;
  }
}
