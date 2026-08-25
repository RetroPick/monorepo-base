export const E2E_WALLET = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
export const E2E_MARKET_ID = "polymarket:market:456";
export const E2E_MARKET_PATH = `/markets/m/${encodeURIComponent(E2E_MARKET_ID)}`;
export const E2E_SIGNATURE = `0x${"aa".repeat(65)}`;

export const e2eMarketDetail = {
  schemaVersion: "1",
  id: E2E_MARKET_ID,
  upstreamId: "456",
  eventId: "polymarket:event:123",
  conditionId: "0xabc",
  slug: "e2e-market",
  question: "Will A happen?",
  description: "Market description for E2E.",
  status: "open",
  endAt: "2026-12-31T23:59:59Z",
  outcomes: [
    { id: "polymarket:token:yes", upstreamId: "999001", name: "Yes", price: "0.42" },
    { id: "polymarket:token:no", upstreamId: "999002", name: "No", price: "0.58" },
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
  resolution: {
    description: "Resolve Yes if A happens before the end date per official sources.",
    sources: [{ name: "Official results", url: "https://example.com/results" }],
    contentHash: "abc123",
    updatedAt: "2026-07-30T12:00:00Z",
  },
};

export const e2eOrderBook = {
  schemaVersion: "1",
  marketId: E2E_MARKET_ID,
  tokenId: "999001",
  bids: [{ price: "0.41", size: "100" }],
  asks: [{ price: "0.43", size: "50" }],
  spread: "0.02",
  freshness: { state: "fresh", observedAt: "2026-07-30T12:00:00Z", ageMillis: 1000 },
  timestamp: "2026-07-30T12:00:00Z",
};

export const e2ePreviewResponse = {
  schemaVersion: "1",
  previewId: "preview-e2e-1",
  contentHash: "0xb98cef5da46413cb869a4af702bb47622b8c0ad0f1b2fdc22739b993dd509536",
  expiresAt: "2099-01-01T00:05:00Z",
  humanSummary: {
    action: "BUY",
    market: "Will A happen?",
    outcome: "Yes",
    size: "100 USDC",
    price: "0.42",
    estimatedFee: "0.10 USDC",
    chainId: 137,
  },
  unsignedPayload: {
    salt: "4242424242424242",
    maker: E2E_WALLET,
    signer: E2E_WALLET,
    tokenId: "999001",
    makerAmount: "100000000",
    takerAmount: "42000000",
    side: 0,
    signatureType: 0,
    timestamp: "1710000000000",
    metadata: "",
    builder: "0000000000000000000000000000000000000000000000000000000000000001",
  },
  exchangeDomain: "standard",
};

export function capabilitiesFixture(orderSubmit: boolean) {
  return {
    schemaVersion: "1",
    intelligence: true,
    features: {
      catalog: true,
      market_detail: true,
      orderbook_read: true,
      price_history: true,
      market_health: true,
      realtime: false,
      signals: false,
      catalog_signals: false,
      live_signals: false,
      order_submit: orderSubmit,
      intelligence_whale_feed: false,
    },
    checkedAt: "2026-08-09T12:00:00Z",
    source: "e2e",
  };
}

export function eligibilityFixture(eligible: boolean, reason?: string) {
  return {
    schemaVersion: "1",
    eligible,
    reason: eligible ? null : reason ?? "geo_denied",
    checkedAt: "2026-08-09T12:00:00Z",
  };
}
