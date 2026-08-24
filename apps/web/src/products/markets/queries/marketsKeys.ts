export const marketsKeys = {
  all: ["markets"] as const,
  capabilities: () => [...marketsKeys.all, "capabilities"] as const,
  events: {
    all: () => [...marketsKeys.all, "events"] as const,
    infiniteList: () => [...marketsKeys.events.all(), "infinite"] as const,
  },
  event: (eventId: string) => [...marketsKeys.all, "event", eventId] as const,
  market: (marketId: string) => [...marketsKeys.all, "market", marketId] as const,
  orderBook: (marketId: string, tokenId: string) =>
    [...marketsKeys.all, "orderbook", marketId, tokenId] as const,
  priceHistory: (marketId: string, tokenId: string, interval: string) =>
    [...marketsKeys.all, "price-history", marketId, tokenId, interval] as const,
  marketHealth: (marketId: string, tokenId: string) =>
    [...marketsKeys.all, "market-health", marketId, tokenId] as const,
};
