import { useQuery } from "@tanstack/react-query";
import { getWorldCupAwardMarkets } from "../lib/worldCupApi";
import { worldCupRefetchInterval, worldCupQueryKeys } from "./useWorldCupQueryOptions";

export function useWorldCupAwards(wsConnected = false) {
  const refetchInterval = worldCupRefetchInterval(wsConnected);
  return useQuery({
    queryKey: worldCupQueryKeys.awards,
    queryFn: getWorldCupAwardMarkets,
    staleTime: 5_000,
    refetchInterval,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
