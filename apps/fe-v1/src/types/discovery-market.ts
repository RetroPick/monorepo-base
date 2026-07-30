import type { Market } from "@/types/market";
import type { MarketDiscoveryVerticalId } from "@/lib/discovery-verticals";

export type NarrativeFilter =
  | "All narratives"
  | "Above Yesterday Close"
  | "Above Daily Open"
  | "Below Weekly Open"
  | "Weekly Breakout Watch";

export type DiscoveryMarket = Market & {
  assetSymbol: "BTC" | "ETH" | "SOL";
  assetName: string;
  timeBucket: "Today" | "This Week" | "Ending Soon";
  schedule: "Daily" | "Weekly";
  narrativeFamily: Exclude<NarrativeFilter, "All narratives">;
  stateCategory: "Open" | "Locked" | "Resolving";
  thresholdLabel: string;
  thresholdValue: number;
  currentPrice: number;
  distancePct: number;
  countdownLabel: string;
  endAt: string;
  yesPoolValue: number;
  noPoolValue: number;
  isFeaturedDiscovery: boolean;
  featuredNote: string;
  ruleText: string;
  heroTag: string;
  discoveryVertical: MarketDiscoveryVerticalId;
};
