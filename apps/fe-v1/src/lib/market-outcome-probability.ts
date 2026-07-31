import type { MarketOutcome } from "@/types/market";
import { formatPayoutMultiplier } from "@/lib/market-odds";

export const PROBABILITY_UNAVAILABLE_LABEL = "—";

export type AvailableOutcomeProbability = {
  status: "available";
  percent: number;
  payoutMultiplier: string;
};

export type OutcomeProbabilityView =
  | AvailableOutcomeProbability
  | { status: "unavailable" };

export function resolveOutcomeProbability(outcome: MarketOutcome): OutcomeProbabilityView {
  if (outcome.probabilityUnavailable) {
    return { status: "unavailable" };
  }

  const probability = outcome.probability;
  if (probability === undefined || !Number.isFinite(probability) || probability < 0 || probability > 100) {
    return { status: "unavailable" };
  }

  return {
    status: "available",
    percent: Math.round(probability),
    payoutMultiplier: formatPayoutMultiplier(probability),
  };
}

export function formatPercentDisplay(view: OutcomeProbabilityView): string {
  if (view.status === "unavailable") {
    return PROBABILITY_UNAVAILABLE_LABEL;
  }
  return `${view.percent}%`;
}

export function formatPayoutDisplay(view: OutcomeProbabilityView): string {
  if (view.status === "unavailable") {
    return PROBABILITY_UNAVAILABLE_LABEL;
  }
  return view.payoutMultiplier;
}

export type BinaryRingInput = {
  yes: OutcomeProbabilityView;
  no: OutcomeProbabilityView;
};

export function resolveBinaryRingInput(yesOutcome: MarketOutcome, noOutcome: MarketOutcome): BinaryRingInput {
  return {
    yes: resolveOutcomeProbability(yesOutcome),
    no: resolveOutcomeProbability(noOutcome),
  };
}

export function binaryRingPercents(input: BinaryRingInput): { yesP?: number; noP?: number; unavailable: boolean } {
  if (input.yes.status !== "available" || input.no.status !== "available") {
    return { unavailable: true };
  }
  return {
    unavailable: false,
    yesP: input.yes.percent,
    noP: input.no.percent,
  };
}

export function multiRingWeights(outcomes: MarketOutcome[]): { weights: number[]; unavailable: boolean } {
  const weights = outcomes.map((outcome) => {
    const view = resolveOutcomeProbability(outcome);
    return view.status === "available" ? Math.max(0, view.percent) : 0;
  });
  const sum = weights.reduce((total, weight) => total + weight, 0);
  return { weights, unavailable: sum <= 0 };
}
