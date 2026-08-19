/**
 * Deterministic pseudo-stats for catalog cards.
 *
 * The Markets contract (schemas/openapi/markets-v1.yaml) does not yet expose
 * volume/liquidity/change per event. These helpers derive stable, render-safe
 * preview values from the canonical id — same pattern the module already used
 * for sparklines/probabilities. When the BFF adds real fields, prefer those
 * and treat these as fallback only.
 */

export function hashFromId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return hash;
}

export function sparklineFromId(id: string): number[] {
  const hash = hashFromId(id);
  return Array.from({ length: 14 }, (_, i) => 0.3 + ((hash >> (i % 16)) & 0xff) / 450);
}

export function calcProbabilityFromId(id: string): number {
  const hash = hashFromId(id);
  return 35 + (hash % 52);
}

export function formatUsdCompact(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${Math.round(value)}`;
}

export function derivedVolumeUsd(id: string): string {
  return formatUsdCompact(180_000 + (hashFromId(id) % 2_800_000));
}

export function derivedVolumeNumeric(id: string): number {
  return 180_000 + (hashFromId(id) % 2_800_000);
}

export function derivedLiquidityUsd(id: string): string {
  return formatUsdCompact(60_000 + ((hashFromId(id) >> 8) % 900_000));
}

/** 24h change in % — range -11% .. +14%. */
export function derivedChangePct(id: string): number {
  return ((hashFromId(id) >> 4) % 26) - 11;
}
