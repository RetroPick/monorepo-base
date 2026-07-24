/** Stored on each market — which content bucket it belongs to. */
export type MarketDiscoveryVerticalId = "crypto" | "economics" | "financials" | "tech_science" | "climate";

/** Tabs in the discover strip (includes view modes like Trending). */
export type DiscoveryVerticalId = MarketDiscoveryVerticalId | "trending";

export const DISCOVERY_VERTICALS: readonly { id: DiscoveryVerticalId; title: string }[] = [
  { id: "trending", title: "Trending" },
  { id: "crypto", title: "Crypto" },
  { id: "economics", title: "Economics" },
  { id: "financials", title: "Financials" },
  { id: "tech_science", title: "Tech & Science" },
  { id: "climate", title: "Climate" },
];
