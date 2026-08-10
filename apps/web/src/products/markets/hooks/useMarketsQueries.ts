import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { getMarketsClient } from "../api/marketsClient";
import { isCanonicalEventId, isCanonicalMarketId } from "../lib/ids";
import { marketsKeys } from "../queries/marketsKeys";
import { marketsQueryOptions } from "../queries/marketsQueryOptions";

export function useMarketsCapabilities() {
  return useQuery(marketsQueryOptions.capabilities());
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
