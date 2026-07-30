import { describe, expect, it } from "vitest";

import { formatProbability, formatPrice, compareDecimalStrings } from "./decimal";
import { evaluateFreshnessUi, formatAgeMillis } from "./freshness";

describe("decimal", () => {
  it("formats prices without unsafe rounding for display", () => {
    expect(formatPrice("0.4250")).toBe("0.425");
    expect(formatPrice(null)).toBe("—");
  });

  it("formats probability from decimal string", () => {
    expect(formatProbability("0.42")).toBe("42.0%");
  });

  it("compares decimal strings lexicographically with padding", () => {
    expect(compareDecimalStrings("0.9", "0.10")).toBeGreaterThan(0);
    expect(compareDecimalStrings("1", "1.0")).toBe(0);
  });
});

describe("freshness", () => {
  it("maps fresh with age to delayed", () => {
    expect(
      evaluateFreshnessUi({ state: "fresh", observedAt: "2026-01-01T00:00:00Z", ageMillis: 45_000 }),
    ).toBe("delayed");
  });

  it("maps closed status", () => {
    expect(evaluateFreshnessUi(undefined, "closed")).toBe("closed");
  });

  it("formats age", () => {
    expect(formatAgeMillis(90_000)).toBe("1m ago");
  });
});
