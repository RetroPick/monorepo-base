export type ResolutionOutcome =
  | { kind: "winner"; winningOutcomeMask: bigint }
  | { kind: "refund"; reason: string }
  | { kind: "void"; reason: string };

export type NumericResolutionInput = {
  observedValue: bigint;
  comparisonValue: bigint;
};

export function resolveDirection(input: NumericResolutionInput): ResolutionOutcome {
  const upWins = input.observedValue >= input.comparisonValue;
  return { kind: "winner", winningOutcomeMask: upWins ? 1n : 2n };
}

export function resolveThreshold(input: NumericResolutionInput): ResolutionOutcome {
  const yesWins = input.observedValue >= input.comparisonValue;
  return { kind: "winner", winningOutcomeMask: yesWins ? 1n : 2n };
}

export function assertResolvableTimestamp(now: number, resolveAt: number): void {
  if (!Number.isFinite(now) || !Number.isFinite(resolveAt)) {
    throw new Error("resolution timestamps must be finite");
  }
  if (now < resolveAt) {
    throw new Error("epoch is not ready for resolution");
  }
}
