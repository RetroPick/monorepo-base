import { describe, expect, it } from "vitest";

import {
  formatProbabilityPercent,
  parseProbabilityDecimal,
  probabilityDecimalToCardPercent,
} from "./probability";

describe("parseProbabilityDecimal", () => {
  it("accepts valid decimals in [0,1]", () => {
    expect(parseProbabilityDecimal("0.5")).toEqual({ ok: true, decimal: 0.5 });
    expect(parseProbabilityDecimal("1")).toEqual({ ok: true, decimal: 1 });
    expect(parseProbabilityDecimal("0")).toEqual({ ok: true, decimal: 0 });
  });

  it("rejects missing, malformed, negative, and >1 values", () => {
    expect(parseProbabilityDecimal(undefined)).toEqual({ ok: false, reason: "missing" });
    expect(parseProbabilityDecimal("")).toEqual({ ok: false, reason: "missing" });
    expect(parseProbabilityDecimal("abc")).toEqual({ ok: false, reason: "malformed" });
    expect(parseProbabilityDecimal("-0.1")).toEqual({ ok: false, reason: "malformed" });
    expect(parseProbabilityDecimal("1.5")).toEqual({ ok: false, reason: "out_of_range" });
  });
});

describe("formatProbabilityPercent", () => {
  it("returns Unavailable for invalid inputs", () => {
    expect(formatProbabilityPercent(null)).toBe("Unavailable");
    expect(formatProbabilityPercent("2")).toBe("Unavailable");
  });

  it("formats valid decimals for display", () => {
    expect(formatProbabilityPercent("0.512")).toBe("51.2%");
  });
});

describe("probabilityDecimalToCardPercent", () => {
  it("returns null when price is unavailable", () => {
    expect(probabilityDecimalToCardPercent(null)).toBeNull();
    expect(probabilityDecimalToCardPercent("9")).toBeNull();
  });
});
