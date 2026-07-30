export const marketsKeys = {
  all: ["markets"] as const,
  eligibility: () => [...marketsKeys.all, "eligibility"] as const,
  capabilities: () => [...marketsKeys.all, "capabilities"] as const,
  events: {
    all: () => [...marketsKeys.all, "events"] as const,
    list: (cursor?: string) => [...marketsKeys.events.all(), "list", cursor ?? ""] as const,
  },
  event: (eventId: string) => [...marketsKeys.all, "event", eventId] as const,
  market: (marketId: string) => [...marketsKeys.all, "market", marketId] as const,
  orderBook: (marketId: string, tokenId: string) =>
    [...marketsKeys.all, "orderbook", marketId, tokenId] as const,
  history: (marketId: string, tokenId: string, interval: string) =>
    [...marketsKeys.all, "history", marketId, tokenId, interval] as const,
  health: (marketId: string, tokenId: string) =>
    [...marketsKeys.all, "health", marketId, tokenId] as const,
  signals: (marketId?: string) => [...marketsKeys.all, "signals", marketId ?? "all"] as const,
};
