/**
 * Catalog card stats are only shown when real data is available.
 *
 * The canonical Markets contract (schemas/openapi/markets-v1.yaml) does not yet
 * expose per-event volume / liquidity / 24h-change, so these helpers return
 * `null` instead of fabricating deterministic pseudo-values from the event id.
 * Call sites render a neutral "—" placeholder when a value is `null`.
 *
 * When the BFF adds real volume / price fields to `EventSummary`, prefer those
 * at the call site and delete these helpers.
 */

export function formatUsdCompact(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${Math.round(value)}`;
}

// No fabricated values: the id does not carry volume, probability, liquidity,
// change, or price history. Return null so consumers render an honest "—".
export function sparklineFromId(_id: string): number[] | null {
  return null;
}

export function calcProbabilityFromId(_id: string): number | null {
  return null;
}

export function derivedVolumeUsd(_id: string): string | null {
  return null;
}

export function derivedVolumeNumeric(_id: string): number | null {
  return null;
}

export function derivedLiquidityUsd(_id: string): string | null {
  return null;
}

export function derivedChangePct(_id: string): number | null {
  return null;
}
