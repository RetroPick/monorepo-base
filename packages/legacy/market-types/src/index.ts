export enum EpochState {
  Scheduled = 0,
  Open = 1,
  Locked = 2,
  Resolved = 3,
  Cancelled = 4,
  Voided = 5,
}

export enum MarketType {
  Direction = 0,
  Threshold = 1,
  RangeClose = 2,
  Velocity = 3,
  Ladder = 4,
  Convergence = 5,
  Composite = 6,
  Corridor = 7,
  Cascade = 8,
}

export enum OracleType {
  Chainlink = 0,
  TrustedReporter = 1,
}

export enum ExecutionMode {
  Manual = 0,
  Rolling = 1,
}

export enum RollingPhase {
  Uninitialized = 0,
  GenesisOpen = 1,
  GenesisClosed = 2,
  Live = 3,
  Halted = 4,
}

export enum RollingHaltReason {
  NoneReason = 0,
  BufferMissOnLock = 1,
  BufferMissOnResolve = 2,
  OracleFailure = 3,
  OracleConfidenceWide = 4,
  ManualAdmin = 5,
}

export const MARKET_TYPE_COUNT = 9;

export type BinaryPresentation = "updown" | "yesno";

export function binaryPresentationForMarketType(
  marketType: number,
  outcomeCount: number,
): BinaryPresentation | undefined {
  if (outcomeCount !== 2) return undefined;
  return marketType === MarketType.Direction ? "updown" : "yesno";
}

export function executionModeLabel(executionMode: number): "Manual" | "Rolling" {
  return executionMode === ExecutionMode.Rolling ? "Rolling" : "Manual";
}

export function rollingPhaseLabel(phase: number | null | undefined): string {
  const p = typeof phase === "number" ? phase : -1;
  const labels: Readonly<Record<number, string>> = {
    [RollingPhase.Uninitialized]: "Uninitialized",
    [RollingPhase.GenesisOpen]: "Genesis open",
    [RollingPhase.GenesisClosed]: "Genesis closed",
    [RollingPhase.Live]: "Live",
    [RollingPhase.Halted]: "Halted",
  };
  if (labels[p] !== undefined) return labels[p] as string;
  if (p < 0) return "Unknown";
  return `Phase ${p}`;
}

export function rollingStatusLabel(args: {
  phase?: number | null;
  haltReason?: number | null;
}): "Live" | "Halted" | "Genesis" | "Uninitialized" | "Unknown" {
  const p = typeof args.phase === "number" ? args.phase : null;
  const r = typeof args.haltReason === "number" ? args.haltReason : null;
  const halted = p === RollingPhase.Halted || (r != null && r !== RollingHaltReason.NoneReason);
  if (halted) return "Halted";
  if (p === RollingPhase.Live) return "Live";
  if (p === RollingPhase.GenesisOpen || p === RollingPhase.GenesisClosed) return "Genesis";
  if (p === RollingPhase.Uninitialized) return "Uninitialized";
  return "Unknown";
}

export function discoverTypeShortLabel(marketType: number): string {
  const labels: Readonly<Record<number, string>> = {
    [MarketType.Direction]: "Up vs down",
    [MarketType.Threshold]: "Yes / No (threshold)",
    [MarketType.RangeClose]: "Range close",
    [MarketType.Velocity]: "Velocity",
    [MarketType.Ladder]: "Ladder",
    [MarketType.Convergence]: "Convergence",
    [MarketType.Composite]: "Composite",
    [MarketType.Corridor]: "Corridor",
    [MarketType.Cascade]: "Cascade",
  };
  if (labels[marketType] !== undefined) return labels[marketType] as string;
  return `Type ${marketType}`;
}

export function defaultOutcomeLabels(marketType: number, outcomeCount: number): string[] {
  const count = Math.min(Math.max(Math.trunc(outcomeCount), 2), 8);
  if (count === 2) {
    return marketType === MarketType.Direction ? ["Up", "Down"] : ["Yes", "No"];
  }
  return Array.from({ length: count }, (_, index) => `Outcome ${index + 1}`);
}
