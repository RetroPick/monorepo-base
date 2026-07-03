const MARKETS_REFETCH_MS = 15_000;

/** Hub page enables WS; hooks poll as fallback when WS invalidation is unavailable. */
export function worldCupRefetchInterval(wsConnected = false): number | false {
  return wsConnected ? false : MARKETS_REFETCH_MS;
}

export const worldCupQueryKeys = {
  all: ["worldCup"] as const,
  markets: ["worldCup", "markets"] as const,
  groups: ["worldCup", "groups"] as const,
  matches: ["worldCup", "matches"] as const,
  stats: (groupId?: string) => ["worldCup", "stats", groupId ?? "all"] as const,
  marketByTeam: (teamCode: string) => ["worldCup", "market", teamCode] as const,
  byStage: (stage: string) => ["worldCup", "stage", stage] as const,
  awards: ["worldCup", "awards"] as const,
};
