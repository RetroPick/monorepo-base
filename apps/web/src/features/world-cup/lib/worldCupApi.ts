import { fetchMarkets } from "@/lib/api/retropickApi";
import type { MarketRow } from "@/lib/api/retropickApi";
import type { WorldCupGroup, WorldCupGroupStats, WorldCupMatch, WorldCupParsedMarket } from "../types/worldCup.types";
import {
  deriveWorldCupAwardMarkets,
  deriveWorldCupGroupStats,
  deriveWorldCupGroups,
  deriveWorldCupMatches,
  filterMarketsByStage,
  findWorldCupMarketByTeam,
  parseWorldCupMarket,
} from "./worldCupDerive";
import { filterWorldCupMarkets } from "./worldCupMarketFilter";
import type { WorldCupStage } from "../types/worldCup.types";
import { mapWorldCupMarketToMarketCard } from "./mapWorldCupMarketToMarketCard";

async function loadMarkets(): Promise<MarketRow[]> {
  return fetchMarkets();
}

export async function getWorldCupMarkets(): Promise<WorldCupParsedMarket[]> {
  const rows = await loadMarkets();
  return filterWorldCupMarkets(rows).map(parseWorldCupMarket);
}

export async function getWorldCupGroups(): Promise<WorldCupGroup[]> {
  const rows = await loadMarkets();
  return deriveWorldCupGroups(rows);
}

export async function getWorldCupMatches(): Promise<WorldCupMatch[]> {
  const rows = await loadMarkets();
  return deriveWorldCupMatches(rows);
}

export async function getWorldCupGroupStats(groupId?: string): Promise<WorldCupGroupStats[]> {
  const rows = await loadMarkets();
  return deriveWorldCupGroupStats(rows, groupId);
}

export async function getWorldCupMarketByTeam(teamCode: string): Promise<WorldCupParsedMarket | null> {
  const rows = await loadMarkets();
  return findWorldCupMarketByTeam(rows, teamCode);
}

export async function getWorldCupMarketsByStage(stage: WorldCupStage): Promise<WorldCupParsedMarket[]> {
  const rows = await loadMarkets();
  return filterMarketsByStage(rows, stage);
}

export async function getWorldCupAwardMarkets(): Promise<MarketRow[]> {
  const rows = await loadMarkets();
  return deriveWorldCupAwardMarkets(rows);
}

export { mapWorldCupMarketToMarketCard };
