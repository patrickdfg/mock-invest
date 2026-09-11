import { prisma } from './db';
import { FEES, config } from './config';
import { getQuote, getQuotes, isKrMarketOpen, type Quote } from './market';
import { marketOf, normalizeSymbol } from './symbols';

/**
 * 주문 체결 엔진.
 *
 * 설계 메모
 * - 모든 금액은 KRW 기준. 미국 주식은 조회 시점 환율로 환산한다.
 * - 시장가는 즉시 체결. 지정가는 PENDING으로 두고 시세를 다시 볼 때 체결 여부를 판정한다(지연 체결).
 * - 지정가 매수는 예수금을 미리 묶지 않는다. 체결 시점에 잔고가 모자라면 그 주문만 자동 취소된다.
 *   (학생용이라 단순함 우선. 사유는 order.memo에 남는다)
 * - 잔고/보유수량 갱신은 전부 prisma.$transaction 안에서 처리해 중복 체결을 막는다.
 */

export class TradeError extends Error {}

export function calcCosts(market: 'KR' | 'US', side: 'BUY' | 'SELL', amount: number) {
  const f = FEES[market];
  const fee = Math.floor(amount * f.commission);
  const tax = side === 'SELL' ? Math.floor(amount * f.sellTax) : 0;
  return { fee, tax };
}

export type PlaceInput = {
  userId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT';
  quantity: number;
  limitPrice?: number | null;
};

export async function placeOrder(input: PlaceInput) {
  const symbol = normalizeSymbol(input.symbol);
  const market = marketOf(symbol);
  const qty = Number(input.quantity);

  if (!Number.isFinite(qty) || qty <= 0) throw new TradeError('수량을 1주 이상 입력하세요.');
  if (market === 'KR' && !Number.isInteger(qty))
    throw new TradeError('국내 주식은 소수점 주문이 불가합니다.');
  if (!config.allow24h && market === 'KR' && !isKrMarketOpen())
    throw new TradeError('장 운영시간(평일 09:00~15:30)이 아닙니다.');

  const quote = await getQuote(symbol); // 종목 유효성 + 현재가

  if (input.type === 'LIMIT') {
    const lp = Number(input.limitPrice);
    if (!Number.isFinite(lp) || lp <= 0) throw new TradeError('지정가를 입력하세요.');
  }

  // 주문 레코드를 만들기 전에 미리 검증한다.
  // (사후 취소로 처리하면 취소 주문만 쌓이고 거래 횟수 통계도 왜곡된다)
  await validateBeforeOrder(input.userId, symbol, market, input.side, qty, input.type, quote.price);

  const order = await prisma.order.create({
    data: {
      userId: input.userId,
      symbol,
      name: quote.name,
      market,
      side: input.side,
      type: input.type,
      quantity: qty,
      limitPrice: input.type === 'LIMIT' ? Number(input.limitPrice) : null,
      status: 'PENDING',
    },
  });

  // 시장가는 즉시 체결 시도
  if (input.type === 'MARKET') {
    const res = await fillOrder(order.id, quote.price);
    if (!res.ok) throw new TradeError(res.reason);
  } else if (shouldFill(input.side, Number(input.limitPrice), quote.price)) {
    // 지정가라도 지금 조건을 만족하면 바로 체결
    await fillOrder(order.id, quote.price);
  }

  // 체결 결과가 반영된 최신 주문을 반환
  return prisma.order.findUniqueOrThrow({ where: { id: order.id } });
}

/** 주문 접수 전 예수금/보유수량 사전 검증 */
async function validateBeforeOrder(
  userId: string,
  symbol: string,
  market: 'KR' | 'US',
  side: 'BUY' | 'SELL',
  qty: number,
  type: 'MARKET' | 'LIMIT',
  price: number
) {
  if (side === 'SELL') {
    const holding = await prisma.holding.findUnique({
      where: { userId_symbol: { userId, symbol } },
    });
    const owned = holding?.quantity ?? 0;
    if (owned < qty) {
      throw new TradeError(`보유 수량이 부족합니다. (보유 ${owned}주)`);
    }
    // 같은 종목에 이미 걸린 매도 대기주문까지 합쳐서 초과 매도를 막는다
    const pending = await prisma.order.aggregate({
      where: { userId, symbol, side: 'SELL', status: 'PENDING' },
      _sum: { quantity: true },
    });
    if (owned < qty + (pending._sum.quantity ?? 0)) {
      throw new TradeError('이미 접수된 매도 대기주문을 포함하면 보유 수량을 초과합니다.');
    }
    return;
  }

  // 시장가 매수만 즉시 잔고 검증. 지정가는 체결 시점 잔고로 판단한다
  if (type !== 'MARKET') return;
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const amount = price * qty;
  const { fee } = calcCosts(market, 'BUY', amount);
  if (user.cash < amount + fee) {
    throw new TradeError(
      `예수금이 부족합니다. (필요 ${Math.ceil(amount + fee).toLocaleString('ko-KR')}원 / 보유 ${Math.floor(user.cash).toLocaleString('ko-KR')}원)`
    );
  }
}

function shouldFill(side: string, limit: number, price: number) {
  return side === 'BUY' ? price <= limit : price >= limit;
}

type FillResult = { ok: true } | { ok: false; reason: string };

/** 단일 주문을 주어진 체결가로 체결. 원자적으로 잔고/보유를 갱신한다 */
export async function fillOrder(orderId: string, price: number): Promise<FillResult> {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order || order.status !== 'PENDING') return { ok: false, reason: '이미 처리된 주문입니다.' };

    const user = await tx.user.findUnique({ where: { id: order.userId } });
    if (!user) return { ok: false, reason: '사용자를 찾을 수 없습니다.' };

    const market = order.market as 'KR' | 'US';
    const amount = price * order.quantity;
    const { fee, tax } = calcCosts(market, order.side as 'BUY' | 'SELL', amount);

    const holding = await tx.holding.findUnique({
      where: { userId_symbol: { userId: order.userId, symbol: order.symbol } },
    });

    if (order.side === 'BUY') {
      const need = amount + fee;
      if (user.cash < need) {
        await tx.order.update({
          where: { id: orderId },
          data: { status: 'CANCELED', memo: '예수금 부족으로 자동 취소' },
        });
        return { ok: false, reason: '예수금이 부족합니다.' };
      }

      const newQty = (holding?.quantity ?? 0) + order.quantity;
      const newAvg =
        ((holding?.avgPrice ?? 0) * (holding?.quantity ?? 0) + amount) / newQty;

      await tx.holding.upsert({
        where: { userId_symbol: { userId: order.userId, symbol: order.symbol } },
        create: {
          userId: order.userId,
          symbol: order.symbol,
          name: order.name,
          market: order.market,
          quantity: order.quantity,
          avgPrice: price,
        },
        update: { quantity: newQty, avgPrice: newAvg },
      });
      await tx.user.update({ where: { id: user.id }, data: { cash: user.cash - need } });
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'FILLED',
          filledPrice: price,
          amount,
          fee,
          tax: 0,
          filledAt: new Date(),
        },
      });
      return { ok: true };
    }

    // SELL
    if (!holding || holding.quantity < order.quantity) {
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'CANCELED', memo: '보유 수량 부족으로 자동 취소' },
      });
      return { ok: false, reason: '보유 수량이 부족합니다.' };
    }

    const proceeds = amount - fee - tax;
    const realized = (price - holding.avgPrice) * order.quantity - fee - tax;
    const restQty = holding.quantity - order.quantity;

    if (restQty <= 0.0000001) {
      await tx.holding.delete({ where: { id: holding.id } });
    } else {
      await tx.holding.update({ where: { id: holding.id }, data: { quantity: restQty } });
    }
    await tx.user.update({ where: { id: user.id }, data: { cash: user.cash + proceeds } });
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: 'FILLED',
        filledPrice: price,
        amount,
        fee,
        tax,
        realizedPnl: realized,
        filledAt: new Date(),
      },
    });
    return { ok: true };
  });
}

/** 대기 중인 지정가 주문을 현재 시세로 체결 판정. 페이지 로드 때마다 호출된다 */
export async function settlePending(userId?: string) {
  const pending = await prisma.order.findMany({
    where: { status: 'PENDING', type: 'LIMIT', ...(userId ? { userId } : {}) },
  });
  if (pending.length === 0) return 0;

  const quotes = await getQuotes(pending.map((o) => o.symbol));
  let filled = 0;
  for (const o of pending) {
    const q = quotes.get(o.symbol.toUpperCase());
    if (!q || q.stale) continue;
    if (shouldFill(o.side, o.limitPrice ?? 0, q.price)) {
      const r = await fillOrder(o.id, q.price);
      if (r.ok) filled++;
    }
  }
  return filled;
}

export async function cancelOrder(userId: string, orderId: string) {
  const order = await prisma.order.findFirst({ where: { id: orderId, userId } });
  if (!order) throw new TradeError('주문을 찾을 수 없습니다.');
  if (order.status !== 'PENDING') throw new TradeError('대기 중인 주문만 취소할 수 있습니다.');
  return prisma.order.update({
    where: { id: orderId },
    data: { status: 'CANCELED', memo: '사용자 취소' },
  });
}

export type PortfolioRow = {
  symbol: string;
  name: string;
  market: string;
  quantity: number;
  avgPrice: number;
  price: number;
  changePct: number;
  value: number;
  cost: number;
  pnl: number;
  pnlPct: number;
  weight: number;
};

export type Portfolio = {
  cash: number;
  seedCash: number;
  stockValue: number;
  totalValue: number;
  totalPnl: number;
  totalPnlPct: number;
  dayPnl: number;
  rows: PortfolioRow[];
};

/** 보유 종목 + 현재가를 합쳐 평가손익까지 계산 */
export async function getPortfolio(userId: string): Promise<Portfolio> {
  const [user, holdings] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.holding.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
  ]);

  const quotes = await getQuotes(holdings.map((h) => h.symbol));

  let stockValue = 0;
  let dayPnl = 0;
  const rows: PortfolioRow[] = holdings.map((h) => {
    const q: Quote | undefined = quotes.get(h.symbol.toUpperCase());
    const price = q?.price ?? h.avgPrice; // 시세 실패 시 평단으로 대체
    const value = price * h.quantity;
    const cost = h.avgPrice * h.quantity;
    stockValue += value;
    if (q) dayPnl += (q.price - q.prevClose) * h.quantity;
    return {
      symbol: h.symbol,
      name: h.name,
      market: h.market,
      quantity: h.quantity,
      avgPrice: h.avgPrice,
      price,
      changePct: q?.changePct ?? 0,
      value,
      cost,
      pnl: value - cost,
      pnlPct: cost > 0 ? ((value - cost) / cost) * 100 : 0,
      weight: 0,
    };
  });

  const totalValue = user.cash + stockValue;
  for (const r of rows) r.weight = totalValue > 0 ? (r.value / totalValue) * 100 : 0;
  rows.sort((a, b) => b.value - a.value);

  return {
    cash: user.cash,
    seedCash: user.seedCash,
    stockValue,
    totalValue,
    totalPnl: totalValue - user.seedCash,
    totalPnlPct: user.seedCash > 0 ? ((totalValue - user.seedCash) / user.seedCash) * 100 : 0,
    dayPnl,
    rows,
  };
}
