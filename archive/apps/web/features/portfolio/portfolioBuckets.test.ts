import { describe, expect, it } from "vitest";

import { discoveryVerticalFromSearchParam } from "@/lib/discovery-verticals";
import type { MarketRow } from "@/lib/api/retropickApi";

import { positionMatchesDiscoveryVertical } from "./portfolioBuckets";

describe("discoveryVerticalFromSearchParam", () => {
  it("defaults to trending", () => {
    expect(discoveryVerticalFromSearchParam(null)).toBe("trending");
    expect(discoveryVerticalFromSearchParam("")).toBe("trending");
  });

  it("accepts known ids", () => {
    expect(discoveryVerticalFromSearchParam("crypto")).toBe("crypto");
    expect(discoveryVerticalFromSearchParam("tech_science")).toBe("tech_science");
  });

  it("rejects unknown", () => {
    expect(discoveryVerticalFromSearchParam("nope")).toBe("trending");
  });
});

function row(slug: string, marketType: number): MarketRow {
  return {
    templateId: "0x1",
    slug,
    marketType,
    outcomeCount: 2,
    initialized: true,
    executionMode: 0,
    rollingPhase: 0,
    rollingHaltReason: 0,
    lastIndexedBlock: 0,
    lastIndexedAt: null,
  };
}

describe("positionMatchesDiscoveryVertical", () => {
  it("trending matches all", () => {
    expect(positionMatchesDiscoveryVertical("trending", undefined, "")).toBe(true);
    expect(positionMatchesDiscoveryVertical("trending", row("anything", 0), "anything")).toBe(true);
  });

  it("crypto uses market row and slug fallback", () => {
    expect(positionMatchesDiscoveryVertical("crypto", row("op-direction-btc", 0), "")).toBe(true);
    expect(positionMatchesDiscoveryVertical("crypto", undefined, "random-politics")).toBe(false);
  });

  it("economics uses slug keywords", () => {
    expect(positionMatchesDiscoveryVertical("economics", row("fed-rate-path", 5), "fed-rate-path")).toBe(true);
    expect(positionMatchesDiscoveryVertical("economics", row("ufc-main-event", 5), "ufc-main-event")).toBe(false);
  });
});
