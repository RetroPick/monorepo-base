import { useQuery } from "@tanstack/react-query";
import { getWorldCupMatches } from "../lib/worldCupApi";
import { worldCupRefetchInterval, worldCupQueryKeys } from "./useWorldCupQueryOptions";

export function useWorldCupMatches(wsConnected = false) {
  const refetchInterval = worldCupRefetchInterval(wsConnected);
  return useQuery({
    queryKey: worldCupQueryKeys.matches,
    queryFn: getWorldCupMatches,
    staleTime: 5_000,
    refetchInterval,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
