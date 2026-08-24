import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type { HistoryInterval } from "@retropick/polymarket";

import { listMarketsWhales } from "../api/intelligenceClient";
import { getMarketsClient } from "../api/marketsClient";
import { isCanonicalEventId, isCanonicalMarketId } from "../lib/ids";
import { marketsKeys } from "../queries/marketsKeys";
import { marketsQueryOptions } from "../queries/marketsQueryOptions";

export function useMarketsCapabilities() {
  return useQuery(marketsQueryOptions.capabilities());
}

export function useMarketsSignals() {
  return useQuery({
    queryKey: marketsKeys.intelligence.signals(),
    queryFn: ({ signal }: { signal?: AbortSignal }) =>
      getMarketsClient()
        .listSignals(undefined, { signal })
        .then((response) => response.data),
    staleTime: 30_000,
  });
}

export function useMarketsWhales(enabled: boolean) {
  return useQuery({
    queryKey: marketsKeys.intelligence.whales(),
    queryFn: ({ signal }: { signal?: AbortSignal }) => listMarketsWhales(signal),
    staleTime: 30_000,
    enabled,
  });
}

export function useMarketsEventsInfinite() {
  return useInfiniteQuery({
    queryKey: marketsKeys.events.infiniteList(),
    queryFn: ({ pageParam, signal }) =>
      getMarketsClient()
        .listEvents({ cursor: pageParam as string | undefined }, { signal })
        .then((r) => r.data),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.page.nextCursor ?? undefined,
    staleTime: marketsQueryOptions.eventsInfinite.staleTime,
  });
}

export function useMarketsEvent(eventId: string) {
  const enabled = eventId.length > 0 && isCanonicalEventId(eventId);
  return useQuery({ ...marketsQueryOptions.event(eventId), enabled });
}

export function useMarketsMarket(marketId: string) {
  const enabled = marketId.length > 0 && isCanonicalMarketId(marketId);
  return useQuery({ ...marketsQueryOptions.market(marketId), enabled });
}

export function useMarketsOrderBook(
  marketId: string,
  tokenId: string,
  fetchEnabled: boolean,
  pollingEnabled: boolean,
) {
  return useQuery(
    marketsQueryOptions.orderBook(marketId, tokenId, fetchEnabled, pollingEnabled),
  );
}

export function useMarketsPriceHistory(
  marketId: string,
  tokenId: string,
  interval: HistoryInterval,
  fetchEnabled: boolean,
) {
  return useQuery(marketsQueryOptions.priceHistory(marketId, tokenId, interval, fetchEnabled));
}

export function useMarketsMarketHealth(marketId: string, tokenId: string, fetchEnabled: boolean) {
  return useQuery(marketsQueryOptions.marketHealth(marketId, tokenId, fetchEnabled));
}
