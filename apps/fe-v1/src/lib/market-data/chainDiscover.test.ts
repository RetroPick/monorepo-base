import { describe, expect, it } from "vitest";
import { isMarketPastSetup, marketRowToCardMarket } from "./chainDiscover";
import type { MarketRow } from "@/lib/api/retropickApi";

const base: MarketRow = {
  templateId: "0x" + "a".repeat(64),
  slug: "test",
  marketType: 0,
  outcomeCount: 2,
  initialized: true,
  executionMode: 0,
  rollingPhase: 0,
  rollingHaltReason: 0,
  lastIndexedBlock: 1,
  lastIndexedAt: null,
};

describe("isMarketPastSetup", () => {
  it("is false for template-only rows", () => {
    expect(isMarketPastSetup({ ...base, initialized: false })).toBe(false);
  });

  it("is true after initializeMarket", () => {
    expect(isMarketPastSetup({ ...base, initialized: true })).toBe(true);
  });
});

describe("marketRowToCardMarket", () => {
  it("uses Up/Down and updown for Direction (type 0)", () => {
    const m = marketRowToCardMarket({ ...base, marketType: 0, outcomeCount: 2, executionMode: 1 });
    expect(m.binaryPresentation).toBe("updown");
    expect(m.outcomes[0]?.label).toBe("Up");
    expect(m.outcomes[1]?.label).toBe("Down");
    expect(m.chainExecutionMode).toBe(1);
    expect(m.chainMarketTypeId).toBe(0);
  });

  it("uses Yes/No and yesno for Threshold (type 1)", () => {
    const m = marketRowToCardMarket({ ...base, marketType: 1, outcomeCount: 2, executionMode: 0 });
    expect(m.binaryPresentation).toBe("yesno");
    expect(m.outcomes[0]?.label).toBe("Yes");
    expect(m.outcomes[1]?.label).toBe("No");
    expect(m.chainExecutionMode).toBe(0);
    expect(m.chainMarketTypeId).toBe(1);
  });

  it("uses indexed outcome probabilities when present", () => {
    const m = marketRowToCardMarket({
      ...base,
      marketType: 1,
      outcomes: [
        { outcomeIndex: 0, poolSize: "300", impliedProbabilityE6: "750000" },
        { outcomeIndex: 1, poolSize: "100", impliedProbabilityE6: "250000" },
      ],
    });
    expect(m.outcomes[0]?.probability).toBe(75);
    expect(m.outcomes[1]?.probability).toBe(25);
  });

  it("derives card pool volume from live outcome pools", () => {
    const m = marketRowToCardMarket({
      ...base,
      marketType: 1,
      outcomes: [
        { outcomeIndex: 0, poolSize: "100000000000000000000", impliedProbabilityE6: "750000" },
        { outcomeIndex: 1, poolSize: "200000000000000000000", impliedProbabilityE6: "250000" },
      ],
    });
    expect(m.totalPool).toBe("300.00");
    expect(m.volume).toBe("300.00");
  });

  it("shows em dash for zero totalPool until there is non-zero pool", () => {
    const m = marketRowToCardMarket({
      ...base,
      marketType: 1,
      totalPool: "0",
      volume: "0",
    });
    expect(m.totalPool).toBe("-");
    expect(m.volume).toBe("-");
  });

  it("shows em dash when summed outcome pools are zero", () => {
    const m = marketRowToCardMarket({
      ...base,
      marketType: 1,
      outcomes: [
        { outcomeIndex: 0, poolSize: "0", impliedProbabilityE6: "500000" },
        { outcomeIndex: 1, poolSize: "0", impliedProbabilityE6: "500000" },
      ],
    });
    expect(m.totalPool).toBe("-");
    expect(m.volume).toBe("-");
  });
});
