import type { HistoryInterval } from "@retropick/polymarket";

import { getMarketsClient } from "../api/marketsClient";
import { marketsKeys } from "./marketsKeys";

const STALE_CATALOG = 90_000;
const STALE_DETAIL = 45_000;
const STALE_CAPABILITIES = 60_000;
const STALE_ELIGIBILITY = 60_000;
const POLL_ORDERBOOK = 8_000;
const POLL_SIGNALS = 30_000;

async function fetchData<T>(promise: Promise<{ data: T }>): Promise<T> {
  const res = await promise;
  return res.data;
}

export const marketsQueryOptions = {
  eligibility: () => ({
    queryKey: marketsKeys.eligibility(),
    queryFn: ({ signal }: { signal?: AbortSignal }) =>
      fetchData(getMarketsClient().getEligibility({ signal })),
    staleTime: STALE_ELIGIBILITY,
  }),
  capabilities: () => ({
    queryKey: marketsKeys.capabilities(),
    queryFn: ({ signal }: { signal?: AbortSignal }) =>
      fetchData(getMarketsClient().getCapabilities({ signal })),
    staleTime: STALE_CAPABILITIES,
  }),
  eventsList: (cursor?: string) => ({
    queryKey: marketsKeys.events.list(cursor),
    queryFn: ({ signal }: { signal?: AbortSignal }) =>
      fetchData(getMarketsClient().listEvents({ cursor }, { signal })),
    staleTime: STALE_CATALOG,
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
  orderBook: (marketId: string, tokenId: string, enabled = true) => ({
    queryKey: marketsKeys.orderBook(marketId, tokenId),
    queryFn: ({ signal }: { signal?: AbortSignal }) =>
      fetchData(getMarketsClient().getOrderBook(marketId, tokenId, { signal })),
    staleTime: 3_000,
    refetchInterval: (enabled ? POLL_ORDERBOOK : false) as number | false,
    refetchIntervalInBackground: false,
    enabled: enabled && marketId.length > 0 && tokenId.length > 0,
  }),
  priceHistory: (marketId: string, tokenId: string, interval: HistoryInterval = "1d") => ({
    queryKey: marketsKeys.history(marketId, tokenId, interval),
    queryFn: ({ signal }: { signal?: AbortSignal }) =>
      fetchData(getMarketsClient().getPriceHistory(marketId, { tokenId, interval }, { signal })),
    staleTime: STALE_DETAIL,
    enabled: marketId.length > 0 && tokenId.length > 0,
  }),
  marketHealth: (marketId: string, tokenId: string) => ({
    queryKey: marketsKeys.health(marketId, tokenId),
    queryFn: ({ signal }: { signal?: AbortSignal }) =>
      fetchData(getMarketsClient().getMarketHealth(marketId, tokenId, { signal })),
    staleTime: 10_000,
    enabled: marketId.length > 0 && tokenId.length > 0,
  }),
  signals: (marketId?: string, intelligenceEnabled = false) => ({
    queryKey: marketsKeys.signals(marketId),
    queryFn: ({ signal }: { signal?: AbortSignal }) =>
      fetchData(getMarketsClient().listSignals({ marketId }, { signal })),
    staleTime: 15_000,
    refetchInterval: (intelligenceEnabled ? POLL_SIGNALS : false) as number | false,
    refetchIntervalInBackground: false,
    enabled: intelligenceEnabled,
  }),
};
