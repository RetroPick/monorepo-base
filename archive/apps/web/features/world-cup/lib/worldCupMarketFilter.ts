import type { MarketRow } from "@/lib/api/retropickApi";
import { MarketType } from "@/types/engine";
import { WORLD_CUP_LADDER_OUTCOME_COUNT } from "./worldCupOutcomes";

const WORLD_CUP_VERTICAL = "world_cup";
const WORLD_CUP_SLUG_PREFIX = "world-cup-";

export function isWorldCupSlug(slug: string): boolean {
  return slug.toLowerCase().startsWith(WORLD_CUP_SLUG_PREFIX);
}

export function isWorldCupVertical(vertical: string | undefined): boolean {
  return vertical?.trim().toLowerCase() === WORLD_CUP_VERTICAL;
}

export function isWorldCupLadderProgressionMarket(row: MarketRow): boolean {
  return row.marketType === MarketType.Ladder && row.outcomeCount === WORLD_CUP_LADDER_OUTCOME_COUNT;
}

export function isWorldCupMatchMarket(row: MarketRow): boolean {
  return isWorldCupMarket(row) && row.slug.toLowerCase().includes("-match-");
}

export function isWorldCupAwardMarket(row: MarketRow): boolean {
  if (!isWorldCupMarket(row)) return false;
  if (isWorldCupMatchMarket(row)) return false;
  if (isWorldCupLadderProgressionMarket(row)) return false;
  return true;
}

/** World Cup markets: vertical tag, slug prefix, or LADDER progression with world-cup slug. */
export function isWorldCupMarket(row: MarketRow): boolean {
  if (isWorldCupVertical(row.vertical)) return true;
  if (isWorldCupSlug(row.slug)) return true;
  return isWorldCupLadderProgressionMarket(row) && isWorldCupSlug(row.slug);
}

export function filterWorldCupMarkets(rows: MarketRow[]): MarketRow[] {
  return rows.filter(isWorldCupMarket);
}

export function filterWorldCupProgressionMarkets(rows: MarketRow[]): MarketRow[] {
  return filterWorldCupMarkets(rows).filter(isWorldCupLadderProgressionMarket);
}

export function filterWorldCupMatchMarkets(rows: MarketRow[]): MarketRow[] {
  return filterWorldCupMarkets(rows).filter(isWorldCupMatchMarket);
}

export function filterWorldCupAwardMarkets(rows: MarketRow[]): MarketRow[] {
  return filterWorldCupMarkets(rows).filter(isWorldCupAwardMarket);
}
