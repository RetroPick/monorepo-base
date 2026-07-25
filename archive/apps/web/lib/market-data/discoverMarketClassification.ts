import type { Market } from "@/types/market";

const MARKET_TYPE_COUNT = 9;

/**
 * `MarketTypes.MarketType` uint; matches `package/prediction-v2/src/types/MarketTypes.sol` order.
 * Direction=0: Up/Down. Threshold=1 and other binary: Yes/No (unless multi-outcome range).
 */
export function binaryPresentationForMarketType(
  marketType: number,
  outcomeCount: number,
): "updown" | "yesno" | undefined {
  if (outcomeCount !== 2) return undefined;
  return marketType === 0 ? "updown" : "yesno";
}

/** `MarketTypes.ExecutionMode`: 0=Manual, 1=Rolling */
export function executionModeLabel(executionMode: number): "Manual" | "Rolling" {
  return executionMode === 1 ? "Rolling" : "Manual";
}

/** Indexer rolling lifecycle phase label (best-effort; unknown values pass through). */
export function rollingPhaseLabel(phase: number | null | undefined): string {
  const p = typeof phase === "number" ? phase : -1;
  const labels: Readonly<Record<number, string>> = {
    0: "Uninitialized",
    1: "Genesis open",
    2: "Genesis closed",
    3: "Live",
    4: "Halted",
  };
  if (labels[p] !== undefined) return labels[p] as string;
  if (p < 0) return "Unknown";
  return `Phase ${p}`;
}

/**
 * Rolling status for cards: show Halted when phase indicates halt or a non-zero halt reason is present.
 * Keeps semantics stable even if the backend encodes halt in either field.
 */
export function rollingStatusLabel(args: {
  phase?: number | null;
  haltReason?: number | null;
}): "Live" | "Halted" | "Genesis" | "Uninitialized" | "Unknown" {
  const p = typeof args.phase === "number" ? args.phase : null;
  const r = typeof args.haltReason === "number" ? args.haltReason : null;
  const halted = (p === 4) || (r != null && r !== 0);
  if (halted) return "Halted";
  if (p === 3) return "Live";
  if (p === 1 || p === 2) return "Genesis";
  if (p === 0) return "Uninitialized";
  return "Unknown";
}

/** User-facing one-line name for the canonical market type (index 0..8+). */
export function discoverTypeShortLabel(marketType: number): string {
  const labels: Readonly<Record<number, string>> = {
    0: "Up vs down",
    1: "Yes / No (threshold)",
    2: "Range close",
    3: "Velocity",
    4: "Ladder",
    5: "Convergence",
    6: "Composite",
    7: "Corridor",
    8: "Cascade",
  };
  if (labels[marketType] !== undefined) {
    return labels[marketType] as string;
  }
  if (marketType >= 0 && marketType < MARKET_TYPE_COUNT) {
    return `Type ${marketType}`;
  }
  return `Type ${marketType}`;
}

/**
 * List/rail one-liner: product kind, execution, template slug.
 * Requires chain-backed fields from `marketRowToCardMarket` for full picture.
 */
export function buildDiscoverSubtitle(market: Market): string {
  const slug = market.slug;
  const mtId = market.chainMarketTypeId;
  const exec = market.chainExecutionMode;

  if (mtId === undefined && exec === undefined) {
    const base = market.marketType ?? "On-chain";
    if (market.slug) return `${base} · ${market.slug}`;
    return base;
  }

  const typeLine = mtId !== undefined ? discoverTypeShortLabel(mtId) : market.marketType ?? "On-chain";
  const execLine = exec !== undefined ? executionModeLabel(exec) : null;

  const parts = [typeLine, execLine, slug].filter((p): p is string => Boolean(p));
  return parts.join(" · ");
}

/**
 * Short eyebrow for featured card: on-chain + execution, plus type when space allows.
 */
export function formatDiscoverEyebrow(market: Market): string {
  if (market.chainExecutionMode === undefined) {
    return market.category;
  }
  const exec = executionModeLabel(market.chainExecutionMode);
  const typeShort =
    market.chainMarketTypeId !== undefined
      ? discoverTypeShortLabel(market.chainMarketTypeId)
      : market.marketType ?? "Market";
  return `On-chain · ${exec} · ${typeShort}`;
}
