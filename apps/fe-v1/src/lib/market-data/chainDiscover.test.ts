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
});
