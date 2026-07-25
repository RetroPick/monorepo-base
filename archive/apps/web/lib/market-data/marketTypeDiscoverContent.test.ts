import { describe, expect, it } from "vitest";
import { discoverMarketTypeEntries } from "@/lib/market-data/marketTypeDiscoverContent";
import { MarketType } from "@/types/engine";

const ALL_MARKET_TYPES = [
  MarketType.Direction,
  MarketType.Threshold,
  MarketType.RangeClose,
  MarketType.Velocity,
  MarketType.Ladder,
  MarketType.Convergence,
  MarketType.Composite,
  MarketType.Corridor,
  MarketType.Cascade,
] as const;

describe("marketTypeDiscoverContent", () => {
  it("lists all 9 on-chain market types once each", () => {
    const entries = discoverMarketTypeEntries();
    expect(entries).toHaveLength(9);
    const ids = entries.map((e) => e.marketType);
    expect(new Set(ids).size).toBe(9);
    for (const t of ALL_MARKET_TYPES) {
      expect(ids).toContain(t);
    }
  });

  it("each entry has multi-step education including payout wording", () => {
    for (const e of discoverMarketTypeEntries()) {
      expect(e.steps.length).toBeGreaterThanOrEqual(6);
      const joined = e.steps.map((s) => `${s.title} ${s.body}`).join(" ").toLowerCase();
      expect(joined).toMatch(/pool|stake|claim|fund|payout|share|refund|void/);
    }
  });
});
