import { useQuery } from "@tanstack/react-query";
import { getWorldCupGroupStats } from "../lib/worldCupApi";
import { worldCupRefetchInterval, worldCupQueryKeys } from "./useWorldCupQueryOptions";

export function useWorldCupGroupStats(groupId?: string, wsConnected = false) {
  const refetchInterval = worldCupRefetchInterval(wsConnected);
  return useQuery({
    queryKey: worldCupQueryKeys.stats(groupId),
    queryFn: () => getWorldCupGroupStats(groupId),
    staleTime: 5_000,
    refetchInterval,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
