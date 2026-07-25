import { useQuery } from "@tanstack/react-query";
import { getWorldCupMarkets } from "../lib/worldCupApi";
import { worldCupRefetchInterval, worldCupQueryKeys } from "./useWorldCupQueryOptions";

export function useWorldCupMarkets(wsConnected = false) {
  const refetchInterval = worldCupRefetchInterval(wsConnected);
  return useQuery({
    queryKey: worldCupQueryKeys.markets,
    queryFn: getWorldCupMarkets,
    staleTime: 5_000,
    refetchInterval,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
