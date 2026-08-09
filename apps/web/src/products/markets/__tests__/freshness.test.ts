import { describe, expect, it } from "vitest";
import type { MarketFreshness } from "@retropick/polymarket";

import {
  evaluateFreshnessUi,
  formatAgeMillis,
  freshnessLabel,
  isDegradedFreshness,
} from "../lib/freshness";

describe("freshness", () => {
  const fresh: MarketFreshness = { state: "fresh", observedAt: "2026-01-01T00:00:00Z", ageMillis: 5000 };
  const stale: MarketFreshness = { state: "stale", observedAt: "2026-01-01T00:00:00Z", ageMillis: 120_000 };

  it("maps API states to UI labels", () => {
    expect(evaluateFreshnessUi(fresh)).toBe("fresh");
    expect(evaluateFreshnessUi(stale)).toBe("stale");
    expect(evaluateFreshnessUi({ state: "resyncing", observedAt: "2026-01-01T00:00:00Z" })).toBe(
      "resyncing",
    );
    expect(freshnessLabel("stale")).toBe("Stale (cached)");
  });

  it("marks delayed when fresh but aged", () => {
    const delayed: MarketFreshness = { ...fresh, ageMillis: 45_000 };
    expect(evaluateFreshnessUi(delayed)).toBe("delayed");
  });

  it("prefers closed/resolved market status", () => {
    expect(evaluateFreshnessUi(fresh, "closed")).toBe("closed");
    expect(evaluateFreshnessUi(fresh, "resolved")).toBe("resolved");
  });

  it("formats age millis", () => {
    expect(formatAgeMillis(5000)).toBe("5s ago");
    expect(formatAgeMillis(90_000)).toBe("1m ago");
  });

  it("detects degraded freshness", () => {
    expect(isDegradedFreshness(fresh)).toBe(false);
    expect(isDegradedFreshness(stale)).toBe(true);
    expect(isDegradedFreshness(undefined)).toBe(true);
  });
});
