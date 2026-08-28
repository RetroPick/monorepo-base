import { getMarketsClient } from "../api/marketsClient";
import { marketsKeys } from "./marketsKeys";
import type { HistoryInterval } from "@retropick/polymarket";

const STALE_CATALOG = 90_000;
const STALE_DETAIL = 45_000;
const STALE_CAPABILITIES = 60_000;
const POLL_ORDERBOOK = 8_000;

async function fetchData<T>(promise: Promise<{ data: T }>): Promise<T> {
  const res = await promise;
  return res.data;
}

export const marketsQueryOptions = {
  capabilities: () => ({
    queryKey: marketsKeys.capabilities(),
    queryFn: ({ signal }: { signal?: AbortSignal }) =>
      fetchData(getMarketsClient().getCapabilities({ signal })),
    staleTime: STALE_CAPABILITIES,
  }),
  event: (eventId: string) => ({
    queryKey: marketsKeys.event(eventId),
    queryFn: ({ signal }: { signal?: AbortSignal }) =>
      fetchData(getMarketsClient().getEvent(eventId, { signal })),
    staleTime: STALE_DETAIL,
    enabled: eventId.length > 0,
  }),
  market: (marketId: string) => ({
    queryKey: marketsKeys.market(marketId),
    queryFn: ({ signal }: { signal?: AbortSignal }) =>
      fetchData(getMarketsClient().getMarket(marketId, { signal })),
    staleTime: STALE_DETAIL,
    enabled: marketId.length > 0,
  }),
  orderBook: (marketId: string, tokenId: string, fetchEnabled = true, pollingEnabled = true) => ({
    queryKey: marketsKeys.orderBook(marketId, tokenId),
    queryFn: ({ signal }: { signal?: AbortSignal }) =>
      fetchData(getMarketsClient().getOrderBook(marketId, tokenId, { signal })),
    staleTime: 3_000,
    refetchInterval: (fetchEnabled && pollingEnabled ? POLL_ORDERBOOK : false) as number | false,
    refetchIntervalInBackground: false,
    enabled: fetchEnabled && marketId.length > 0 && tokenId.length > 0,
  }),
  priceHistory: (marketId: string, tokenId: string, interval: HistoryInterval, fetchEnabled = true) => ({
    queryKey: marketsKeys.priceHistory(marketId, tokenId, interval),
    queryFn: ({ signal }: { signal?: AbortSignal }) =>
      fetchData(getMarketsClient().getPriceHistory(marketId, { tokenId, interval }, { signal })),
    staleTime: STALE_DETAIL,
    enabled: fetchEnabled && marketId.length > 0 && tokenId.length > 0,
  }),
  marketHealth: (marketId: string, tokenId: string, fetchEnabled = true) => ({
    queryKey: marketsKeys.marketHealth(marketId, tokenId),
    queryFn: ({ signal }: { signal?: AbortSignal }) =>
      fetchData(getMarketsClient().getMarketHealth(marketId, tokenId, { signal })),
    staleTime: 8_000,
    enabled: fetchEnabled && marketId.length > 0 && tokenId.length > 0,
  }),
  eventsInfinite: {
    queryKey: marketsKeys.events.infiniteList(),
    staleTime: STALE_CATALOG,
  },
};
