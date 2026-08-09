import { describe, expect, it } from "vitest";

import { evaluateBookTradingGuard, isBookStale, isMarketableLimit } from "../lib/bookTradingGuard";
import type { OrderBookSnapshot } from "@retropick/polymarket";

const freshBook: OrderBookSnapshot = {
  schemaVersion: "1",
  marketId: "polymarket:market:456",
  tokenId: "token-yes",
  bids: [{ price: "0.40", size: "100" }],
  asks: [{ price: "0.43", size: "50" }],
  spread: "0.03",
  freshness: { state: "fresh", observedAt: "2026-07-30T12:00:00Z", ageMillis: 1000 },
  timestamp: "2026-07-30T12:00:00Z",
};

const staleBook: OrderBookSnapshot = {
  ...freshBook,
  freshness: { state: "stale", observedAt: "2026-07-30T12:00:00Z", ageMillis: 8000 },
};

describe("bookTradingGuard", () => {
  it("detects stale book by state and age", () => {
    expect(isBookStale(freshBook.freshness, "open")).toBe(false);
    expect(isBookStale(staleBook.freshness, "open")).toBe(true);
    expect(
      isBookStale({ state: "fresh", observedAt: "2026-07-30T12:00:00Z", ageMillis: 6000 }, "open"),
    ).toBe(true);
  });

  it("detects marketable buy against best ask", () => {
    expect(isMarketableLimit("BUY", "0.43", freshBook)).toBe(true);
    expect(isMarketableLimit("BUY", "0.42", freshBook)).toBe(false);
  });

  it("blocks preview for marketable limit on stale book", () => {
    const result = evaluateBookTradingGuard({
      side: "BUY",
      price: "0.43",
      orderBook: staleBook,
      marketStatus: "open",
    });
    expect(result.blockPreview).toBe(true);
    expect(result.marketableBlocked).toBe(true);
  });

  it("allows resting limit on stale book with warning", () => {
    const result = evaluateBookTradingGuard({
      side: "BUY",
      price: "0.39",
      orderBook: staleBook,
      marketStatus: "open",
    });
    expect(result.blockPreview).toBe(false);
    expect(result.warningMessage).toBe("ORDER_STALE_RESTING");
  });
});
