import { useQuery } from "@tanstack/react-query";
import type { WorldCupStage } from "../types/worldCup.types";
import { getWorldCupMarketsByStage } from "../lib/worldCupApi";
import { worldCupRefetchInterval, worldCupQueryKeys } from "./useWorldCupQueryOptions";

export function useWorldCupMarketsByStage(stage: WorldCupStage, wsConnected = false) {
  const refetchInterval = worldCupRefetchInterval(wsConnected);
  return useQuery({
    queryKey: worldCupQueryKeys.byStage(stage),
    queryFn: () => getWorldCupMarketsByStage(stage),
    staleTime: 5_000,
    refetchInterval,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
