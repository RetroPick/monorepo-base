import { useQuery, useInfiniteQuery } from "@tanstack/react-query";

import { marketsKeys } from "../queries/marketsKeys";
import { marketsQueryOptions } from "../queries/marketsQueryOptions";

export function useMarketsEligibility() {
  return useQuery(marketsQueryOptions.eligibility());
}

export function useMarketsCapabilities() {
  return useQuery(marketsQueryOptions.capabilities());
}

export function useMarketsEvents() {
  return useQuery(marketsQueryOptions.eventsList());
}

export function useMarketsEventsInfinite() {
  return useInfiniteQuery({
    queryKey: marketsKeys.events.infiniteList(),
    queryFn: ({ pageParam, signal }) =>
      import("../api/marketsClient").then(({ getMarketsClient }) =>
        getMarketsClient()
          .listEvents({ cursor: pageParam as string | undefined }, { signal })
          .then((r) => r.data),
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.page.nextCursor ?? undefined,
    staleTime: marketsQueryOptions.eventsList().staleTime,
  });
}

export function useMarketsEvent(eventId: string) {
  return useQuery(marketsQueryOptions.event(eventId));
}

export function useMarketsMarket(marketId: string) {
  return useQuery(marketsQueryOptions.market(marketId));
}

export function useMarketsOrderBook(marketId: string, tokenId: string, pollingEnabled: boolean) {
  return useQuery(marketsQueryOptions.orderBook(marketId, tokenId, pollingEnabled));
}

export function useMarketsPriceHistory(
  marketId: string,
  tokenId: string,
  interval: "1h" | "6h" | "1d" | "1w" | "max" = "1d",
) {
  return useQuery(marketsQueryOptions.priceHistory(marketId, tokenId, interval));
}

export function useMarketsHealth(marketId: string, tokenId: string) {
  return useQuery(marketsQueryOptions.marketHealth(marketId, tokenId));
}

export function useMarketsSignals(marketId?: string) {
  const capabilities = useMarketsCapabilities();
  const intelligence = capabilities.data?.intelligence === true;
  return useQuery(marketsQueryOptions.signals(marketId, intelligence));
}
