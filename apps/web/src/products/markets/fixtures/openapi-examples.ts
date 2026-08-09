import type { MarketDetail } from "@retropick/polymarket";

type ResolutionRule = MarketDetail["resolution"];

export const sampleResolution: ResolutionRule = {
  description: "Resolve Yes if A happens before the end date per official sources.",
  sources: [
    { name: "Official results", url: "https://example.com/results" },
    { name: "Polymarket resolution source", url: "https://example.com/rules" },
  ],
  contentHash: "abc123",
  updatedAt: "2026-07-30T12:00:00Z",
};

export const sampleMarketDetail: MarketDetail = {
  schemaVersion: "1",
  id: "polymarket:market:456",
  upstreamId: "456",
  eventId: "polymarket:event:123",
  conditionId: "0xabc",
  slug: "conformance-market",
  question: "Will A happen?",
  description: "Market description for tests.",
  status: "open",
  endAt: "2026-12-31T23:59:59Z",
  outcomes: [
    { id: "polymarket:token:yes", upstreamId: "token-yes", name: "Yes", price: "0.42" },
    { id: "polymarket:token:no", upstreamId: "token-no", name: "No", price: "0.58" },
  ],
  capabilities: {
    orderBook: true,
    history: true,
    realtime: false,
    negRisk: false,
    trading: false,
  },
  freshness: { state: "fresh", observedAt: "2026-07-30T12:00:00Z", ageMillis: 5000 },
  provenance: {
    source: "polymarket_gamma",
    observedAt: "2026-07-30T12:00:00Z",
    contentHash: "market-hash",
  },
  resolution: sampleResolution,
};
