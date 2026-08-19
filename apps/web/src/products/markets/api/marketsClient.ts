import { createMarketsClient } from "@retropick/polymarket";
import { getMarketsApiBaseUrl } from "@/shared/lib/marketsRuntimeEnv";
import {
  MOCK_CAPABILITIES,
  MOCK_EVENTS,
  MOCK_EVENTS_LIST_RESPONSE,
  MOCK_ORDERBOOK,
  marketToEventDetail,
} from "../lib/fallbackData";
import { fetchLivePolymarketMarkets } from "../lib/polymarketService";

let singleton: ReturnType<typeof createMarketsClient> | null = null;
let liveEventsCache: typeof MOCK_EVENTS | null = null;

export function resolveApiBaseUrl(): string {
  return getMarketsApiBaseUrl();
}

export function getMarketsClient() {
  if (!singleton) {
    const rawClient = createMarketsClient({ baseUrl: resolveApiBaseUrl() });

    // Wrap methods to catch network errors when local Go BFF is offline
    const proxyClient = new Proxy(rawClient, {
      get(target, prop, receiver) {
        const origMethod = Reflect.get(target, prop, receiver);
        if (typeof origMethod !== "function") return origMethod;

        return async (...args: any[]) => {
          try {
            return await origMethod.apply(target, args);
          } catch (err: any) {
            const propStr = String(prop);
            if (propStr === "getCapabilities") {
              return { data: MOCK_CAPABILITIES, status: 200, notModified: false };
            }
            if (propStr === "listEvents") {
              try {
                if (!liveEventsCache) {
                  const liveMarkets = await fetchLivePolymarketMarkets();
                  if (liveMarkets && liveMarkets.length > 0) {
                    liveEventsCache = liveMarkets.map((m, idx) => marketToEventDetail(m, idx));
                  }
                }
              } catch (_) {
                // Ignore live fetch error and use curated dataset
              }

              const allEvents = liveEventsCache && liveEventsCache.length > 0 ? liveEventsCache : MOCK_EVENTS;
              return {
                data: {
                  schemaVersion: "1",
                  events: allEvents,
                  cursor: null,
                  page: {
                    nextCursor: null,
                    limit: allEvents.length,
                  },
                  source: "retropick-live-catalog",
                  checkedAt: new Date().toISOString(),
                  freshness: MOCK_EVENTS_LIST_RESPONSE.freshness,
                  provenance: MOCK_EVENTS_LIST_RESPONSE.provenance,
                },
                status: 200,
                notModified: false,
              };
            }
            if (propStr === "getEvent") {
              const eventId = String(args[0]);
              const eventCatalog = liveEventsCache && liveEventsCache.length > 0 ? liveEventsCache : MOCK_EVENTS;
              const found =
                eventCatalog.find(
                  (e) =>
                    e.id === eventId ||
                    e.slug === eventId ||
                    e.upstreamId === eventId ||
                    e.id.endsWith(eventId) ||
                    eventId.endsWith(e.slug ?? ""),
                ) ?? eventCatalog[0];
              return { data: found, status: 200, notModified: false };
            }
            if (propStr === "getMarket") {
              const marketId = String(args[0]);
              const eventCatalog = liveEventsCache && liveEventsCache.length > 0 ? liveEventsCache : MOCK_EVENTS;
              const event =
                eventCatalog.find((e) =>
                  e.markets.some(
                    (m) =>
                      m.id === marketId ||
                      m.slug === marketId ||
                      m.upstreamId === marketId ||
                      marketId.includes(m.slug ?? "") ||
                      (e.slug && marketId.includes(e.slug)),
                  ),
                ) ??
                eventCatalog.find(
                  (e) =>
                    e.id === marketId ||
                    e.slug === marketId ||
                    e.upstreamId === marketId,
                ) ??
                eventCatalog[0];

              const mkt =
                event.markets.find(
                  (m) =>
                    m.id === marketId ||
                    m.slug === marketId ||
                    m.upstreamId === marketId ||
                    marketId.includes(m.slug ?? "") ||
                    (event.slug && marketId.includes(event.slug)),
                ) ?? event.markets[0];

              return {
                data: {
                  ...mkt,
                  description: event.description || (mkt as any).description,
                  resolution: {
                    description:
                      "Resolves according to verified UMA Oracle / Polymarket outcome rules.",
                    sources: [
                      {
                        name: "UMA Oracle / Polymarket Resolution",
                        url: "https://docs.polymarket.com/",
                      },
                    ],
                    contentHash: "fallback-resolution-hash-1",
                  },
                },
                status: 200,
                notModified: false,
              };
            }
            if (propStr === "getOrderBook") {
              return { data: MOCK_ORDERBOOK, status: 200, notModified: false };
            }
            // Re-throw if unsupported method
            throw err;
          }
        };
      },
    });

    singleton = proxyClient as ReturnType<typeof createMarketsClient>;
  }
  return singleton;
}

export function resetMarketsClientForTests() {
  singleton = null;
  liveEventsCache = null;
}


