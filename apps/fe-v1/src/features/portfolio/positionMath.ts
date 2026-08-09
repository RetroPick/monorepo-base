import type { MarketRow } from "@/lib/api/retropickApi";

import { parseStakeRaw } from "@/features/portfolio/formatStakeUsd";

export function parseStakesArray(position: Record<string, unknown>): bigint[] {
  const s = position.stakes;
  if (!Array.isArray(s)) return [];
  return s.map((x) => parseStakeRaw(x) ?? 0n);
}

export function dominantOutcomeIndex(stakes: bigint[]): number {
  let max = -1n;
  let idx = 0;
  stakes.forEach((v, i) => {
    if (v > max) {
      max = v;
      idx = i;
    }
  });
  return idx;
}

export function outcomeLabelForIndex(row: MarketRow | undefined, idx: number, outcomeCount: number): string {
  if (outcomeCount <= 1) return `Outcome ${idx}`;
  if (outcomeCount === 2) {
    if (row?.marketType === 0) return idx === 0 ? "Up" : "Down";
    return idx === 0 ? "Yes" : "No";
  }
  return `Outcome ${idx}`;
}

export function formatImpliedPercent(impliedProbabilityE6: string | undefined): string {
  if (!impliedProbabilityE6 || !/^\d+$/.test(impliedProbabilityE6)) return "-";
  const n = Number(impliedProbabilityE6) / 10_000;
  if (!Number.isFinite(n)) return "-";
  return `${n.toFixed(1)}%`;
}