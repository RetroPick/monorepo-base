import { useQuery } from "@tanstack/react-query";
import { getWorldCupMarketByTeam } from "../lib/worldCupApi";
import { worldCupRefetchInterval, worldCupQueryKeys } from "./useWorldCupQueryOptions";

export function useWorldCupMarketByTeam(teamCode: string, wsConnected = false) {
  const refetchInterval = worldCupRefetchInterval(wsConnected);
  return useQuery({
    queryKey: worldCupQueryKeys.marketByTeam(teamCode),
    queryFn: () => getWorldCupMarketByTeam(teamCode),
    enabled: !!teamCode,
    staleTime: 5_000,
    refetchInterval,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
