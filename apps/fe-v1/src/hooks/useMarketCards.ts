import { useQuery } from "@tanstack/react-query";

import { buildRetroPickRoundCardsFromApi } from "@/lib/market-data/market-cards";
import { RetroPickRoundCardDTO } from "@/lib/market-data/types";

export function useMarketCards() {
  const q = useQuery({
    queryKey: ["retropick-api", "markets"],
    queryFn: buildRetroPickRoundCardsFromApi,
    staleTime: 5_000,
  });

  return {
    data: (q.data ?? []) as RetroPickRoundCardDTO[],
    loading: q.isLoading,
    error: q.error instanceof Error ? q.error.message : q.error ? String(q.error) : null,
  };
}
