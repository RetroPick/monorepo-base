import { describe, expect, it } from "vitest";

import {
  binaryPresentationForMarketType,
  buildDiscoverSubtitle,
  discoverTypeShortLabel,
  executionModeLabel,
  formatDiscoverEyebrow,
} from "./discoverMarketClassification";
import type { Market } from "@/types/market";

describe("binaryPresentationForMarketType", () => {
  it("uses up/down only for Direction (0) with two outcomes", () => {
    expect(binaryPresentationForMarketType(0, 2)).toBe("updown");
  });

  it("uses yes/no for Threshold (1) and other non-direction binary", () => {
    expect(binaryPresentationForMarketType(1, 2)).toBe("yesno");
    expect(binaryPresentationForMarketType(3, 2)).toBe("yesno");
  });

  it("returns undefined for non-binary", () => {
    expect(binaryPresentationForMarketType(0, 3)).toBeUndefined();
    expect(binaryPresentationForMarketType(2, 4)).toBeUndefined();
  });
});

describe("executionModeLabel", () => {
  it("maps 0/1 to Manual/Rolling", () => {
    expect(executionModeLabel(0)).toBe("Manual");
    expect(executionModeLabel(1)).toBe("Rolling");
    expect(executionModeLabel(99)).toBe("Manual");
  });
});

describe("discoverTypeShortLabel", () => {
  it("uses friendly names for 0-8 and fallback for unknown", () => {
    expect(discoverTypeShortLabel(0)).toBe("Up vs down");
    expect(discoverTypeShortLabel(1)).toBe("Yes / No (threshold)");
    expect(discoverTypeShortLabel(2)).toBe("Range close");
    expect(discoverTypeShortLabel(12)).toBe("Type 12");
  });
});

function chainMarket(overrides: Partial<Market>): Market {
  return {
    id: "0x" + "a".repeat(64),
    title: "Test",
    category: "On-chain",
    icon: "show_chart",
    outcomes: [
      { id: "0", label: "Yes", probability: 50 },
      { id: "1", label: "No", probability: 50 },
    ],
    volume: "—",
    ...overrides,
  };
}

describe("buildDiscoverSubtitle", () => {
  it("joins type, execution, and slug for chain markets", () => {
    const m = chainMarket({
      slug: "demo-eth",
      chainMarketTypeId: 1,
      chainExecutionMode: 0,
    });
    expect(buildDiscoverSubtitle(m)).toBe("Yes / No (threshold) · Manual · demo-eth");
  });

  it("falls back to marketType string when chain ids missing", () => {
    const m = chainMarket({
      slug: "x",
      marketType: "Threshold",
    });
    expect(buildDiscoverSubtitle(m)).toBe("Threshold · x");
  });
});

describe("formatDiscoverEyebrow", () => {
  it("uses On-chain, execution, and short type when chain fields set", () => {
    const m = chainMarket({
      chainMarketTypeId: 0,
      chainExecutionMode: 1,
    });
    expect(formatDiscoverEyebrow(m)).toBe("On-chain · Rolling · Up vs down");
  });

  it("returns category when execution unknown", () => {
    const m = chainMarket({ category: "On-chain" });
    expect(formatDiscoverEyebrow(m)).toBe("On-chain");
  });
});
