import { describe, expect, it } from "vitest";

import type { MarketOutcome } from "@/types/market";

import {
  binaryRingPercents,
  formatPayoutDisplay,
  formatPercentDisplay,
  multiRingWeights,
  resolveBinaryRingInput,
  resolveOutcomeProbability,
} from "./market-outcome-probability";

function outcome(overrides: Partial<MarketOutcome> & Pick<MarketOutcome, "id" | "label">): MarketOutcome {
  return { ...overrides };
}

describe("resolveOutcomeProbability", () => {
  it("accepts valid finite probabilities including 0 and 100", () => {
    expect(resolveOutcomeProbability(outcome({ id: "a", label: "Yes", probability: 0 }))).toEqual({
      status: "available",
      percent: 0,
      payoutMultiplier: "—",
    });
    expect(resolveOutcomeProbability(outcome({ id: "b", label: "Yes", probability: 100 }))).toEqual({
      status: "available",
      percent: 100,
      payoutMultiplier: "—",
    });
    expect(resolveOutcomeProbability(outcome({ id: "c", label: "Yes", probability: 51.2 }))).toEqual({
      status: "available",
      percent: 51,
      payoutMultiplier: "1.95x",
    });
  });

  it("marks missing, flagged, negative, and out-of-range probabilities unavailable", () => {
    expect(resolveOutcomeProbability(outcome({ id: "a", label: "Yes" }))).toEqual({ status: "unavailable" });
    expect(
      resolveOutcomeProbability(outcome({ id: "b", label: "Yes", probabilityUnavailable: true, probability: 50 })),
    ).toEqual({ status: "unavailable" });
    expect(resolveOutcomeProbability(outcome({ id: "c", label: "Yes", probability: -1 }))).toEqual({
      status: "unavailable",
    });
    expect(resolveOutcomeProbability(outcome({ id: "d", label: "Yes", probability: 101 }))).toEqual({
      status: "unavailable",
    });
    expect(resolveOutcomeProbability(outcome({ id: "e", label: "Yes", probability: Number.NaN }))).toEqual({
      status: "unavailable",
    });
  });
});

describe("binary and multi availability", () => {
  it("supports both binary outcomes valid", () => {
    const ring = binaryRingPercents(
      resolveBinaryRingInput(
        outcome({ id: "yes", label: "Yes", probability: 62 }),
        outcome({ id: "no", label: "No", probability: 38 }),
      ),
    );
    expect(ring).toEqual({ unavailable: false, yesP: 62, noP: 38 });
  });

  it("marks partial binary availability unavailable for the ring", () => {
    const ring = binaryRingPercents(
      resolveBinaryRingInput(
        outcome({ id: "yes", label: "Yes", probability: 62 }),
        outcome({ id: "no", label: "No", probabilityUnavailable: true }),
      ),
    );
    expect(ring.unavailable).toBe(true);
  });

  it("marks both binary outcomes unavailable", () => {
    const ring = binaryRingPercents(
      resolveBinaryRingInput(
        outcome({ id: "yes", label: "Yes", probabilityUnavailable: true }),
        outcome({ id: "no", label: "No", probabilityUnavailable: true }),
      ),
    );
    expect(ring.unavailable).toBe(true);
  });

  it("handles multi-outcome partial availability", () => {
    const { weights, unavailable } = multiRingWeights([
      outcome({ id: "a", label: "A", probability: 40 }),
      outcome({ id: "b", label: "B", probabilityUnavailable: true }),
      outcome({ id: "c", label: "C", probability: 20 }),
    ]);
    expect(unavailable).toBe(false);
    expect(weights).toEqual([40, 0, 20]);
  });

  it("handles range partial availability", () => {
    const { unavailable } = multiRingWeights([
      outcome({ id: "a", label: "<10", probabilityUnavailable: true }),
      outcome({ id: "b", label: "10-20", probabilityUnavailable: true }),
    ]);
    expect(unavailable).toBe(true);
  });
});

describe("display helpers", () => {
  it("never formats NaN or Infinity text", () => {
    const unavailable = resolveOutcomeProbability(outcome({ id: "a", label: "Yes", probability: Number.NaN }));
    expect(formatPercentDisplay(unavailable)).not.toMatch(/NaN|Infinity/);
    expect(formatPayoutDisplay(unavailable)).not.toMatch(/NaN|Infinity/);
    expect(formatPayoutDisplay(unavailable)).toBe("—");
  });

  it("does not render payout multiplier for unavailable probability", () => {
    const unavailable = resolveOutcomeProbability(outcome({ id: "a", label: "Yes", probabilityUnavailable: true }));
    expect(formatPayoutDisplay(unavailable)).toBe("—");
    expect(formatPayoutDisplay(unavailable)).not.toMatch(/x$/);
  });
});
