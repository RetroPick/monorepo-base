import type { MarketFreshness, OrderBookSnapshot } from "@retropick/polymarket";

import { isDecimalGte, isDecimalLte } from "./compareDecimalString";

const STALE_AGE_MS = 5_000;

export type BookTradingGuardResult = {
  bookStale: boolean;
  blockPreview: boolean;
  marketableBlocked: boolean;
  warningMessage: string | null;
  blockMessage: string | null;
};

export function isBookStale(
  freshness: MarketFreshness | undefined,
  marketStatus?: string,
): boolean {
  if (!freshness) return true;
  if (freshness.state === "stale" || freshness.state === "unavailable" || freshness.state === "invalid") {
    return true;
  }
  if (marketStatus === "open" && freshness.ageMillis != null && freshness.ageMillis > STALE_AGE_MS) {
    return true;
  }
  return false;
}

export function isMarketableLimit(
  side: "BUY" | "SELL",
  price: string,
  orderBook: OrderBookSnapshot | undefined,
): boolean {
  if (!orderBook) return false;
  if (side === "BUY" && orderBook.asks.length > 0) {
    const bestAsk = orderBook.asks[0]?.price;
    if (bestAsk && isDecimalGte(price, bestAsk)) return true;
  }
  if (side === "SELL" && orderBook.bids.length > 0) {
    const bestBid = orderBook.bids[0]?.price;
    if (bestBid && isDecimalLte(price, bestBid)) return true;
  }
  return false;
}

export function evaluateBookTradingGuard(input: {
  side: "BUY" | "SELL";
  price: string;
  orderBook?: OrderBookSnapshot;
  marketStatus?: string;
}): BookTradingGuardResult {
  const bookStale = isBookStale(input.orderBook?.freshness, input.marketStatus);
  const marketable = isMarketableLimit(input.side, input.price, input.orderBook);

  if (!bookStale) {
    return {
      bookStale: false,
      blockPreview: false,
      marketableBlocked: false,
      warningMessage: null,
      blockMessage: null,
    };
  }

  if (marketable) {
    return {
      bookStale: true,
      blockPreview: true,
      marketableBlocked: true,
      warningMessage: null,
      blockMessage: "ORDER_STALE_MARKETABLE",
    };
  }

  return {
    bookStale: true,
    blockPreview: false,
    marketableBlocked: false,
    warningMessage: "ORDER_STALE_RESTING",
    blockMessage: null,
  };
}
