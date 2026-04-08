import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, ChevronRight, TrendingUp } from "lucide-react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { AssetLogo } from "@/components/AssetLogo";
import { cn } from "@/lib/utils";
import { Market } from "@/types/market";

type DiscoveryTab = "All" | "Today" | "This Week" | "Ending Soon" | "Featured" | "My Positions";
type AssetFilter = "All assets" | string;
type NarrativeFilter =
  | "All narratives"
  | "Above Yesterday Close"
  | "Above Daily Open"
  | "Below Weekly Open"
  | "Weekly Breakout Watch";

type DiscoveryMarket = Market & {
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
};

const TABS: DiscoveryTab[] = ["All", "Today", "This Week", "Ending Soon", "Featured", "My Positions"];

const discoveryStatusStyles: Record<
  DiscoveryMarket["stateCategory"],
  {
    badge: string;
  }
> = {
  Open: {
    badge: "border-[#1f4e39] bg-[#193629] text-[#7df0b6]",
  },
  Locked: {
    badge: "border-[#5b4720] bg-[#3b3120] text-[#f7cf6a]",
  },
  Resolving: {
    badge: "border-[#1f4764] bg-[#163246] text-[#7bc7ff]",
  },
};

function buildDate(base: number, offsetHours: number) {
  return new Date(base + offsetHours * 60 * 60 * 1000);
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatCountdown(targetIso: string, nowMs: number) {
  const diff = new Date(targetIso).getTime() - nowMs;
  if (diff <= 0) return "Closed";
  const totalMinutes = Math.floor(diff / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function yesPercentFromPools(market: DiscoveryMarket) {
  const t = market.yesPoolValue + market.noPoolValue;
  if (t <= 0) return 50;
  return Math.round((market.yesPoolValue / t) * 100);
}

function thresholdSubtitle(market: DiscoveryMarket) {
  const v = market.thresholdValue;
  const price =
    v >= 1000
      ? `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
      : `$${v.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  return `${price} · ${market.thresholdLabel}`;
}

function getDiscoveryMarkets(nowMs: number): DiscoveryMarket[] {
  const baseDay = new Date(nowMs);
  baseDay.setMinutes(0, 0, 0);
  const base = baseDay.getTime();

  const raw: Array<Omit<DiscoveryMarket, "countdownLabel"> & { endAtDate: Date }> = [
    {
      id: "btc-daily-yesterday-close",
      title: "BTC at or above yesterday close by today close",
      description: "Daily threshold contract built for the habit loop: one clear level, one close, one deterministic answer.",
      category: "Threshold",
      primitive: "Threshold",
      marketType: "Daily threshold",
      icon: "query_stats",
      iconColor: "text-amber-500",
      outcomes: [
        { id: "yes", label: "YES", probability: 56 },
        { id: "no", label: "NO", probability: 44 },
      ],
      volume: "$412K",
      totalPool: "$164,000",
      expiry: "Today close",
      isBinary: true,
      oracleSource: "Chainlink BTC/USD",
      timeframe: "1 DAY",
      status: "Open",
      roundId: "BTC-TT-1001",
      lockRule: "Threshold is fixed from the previous daily close before entry closes.",
      closeRule: "Final oracle close is captured at the end of the daily window.",
      resolutionFormula: "YES wins if the final oracle price is at or above 108,400 at today's close.",
      invalidationRule: "Refund if the daily close oracle read is stale or unavailable.",
      settlementLabel: "Machine-settled on Solana",
      assetSymbol: "BTC",
      assetName: "Bitcoin",
      timeBucket: "Today",
      schedule: "Daily",
      narrativeFamily: "Above Yesterday Close",
      stateCategory: "Open",
      thresholdLabel: "Yesterday close",
      thresholdValue: 108400,
      currentPrice: 107960,
      distancePct: 0.41,
      endAtDate: buildDate(base, 8),
      endAt: "",
      yesPoolValue: 94200,
      noPoolValue: 69800,
      isFeaturedDiscovery: true,
      featuredNote: "The benchmark daily BTC threshold with the clearest story on the page.",
      ruleText: "YES wins if the final oracle price is at or above 108,400 at today's close.",
      heroTag: "Today's key level",
    },
    {
      id: "eth-daily-open",
      title: "ETH at or above daily open by today close",
      description: "Fast-scanning daily setup framed around the opening reference users already understand from charting.",
      category: "Threshold",
      primitive: "Threshold",
      marketType: "Daily threshold",
      icon: "diamond",
      iconColor: "text-sky-400",
      outcomes: [
        { id: "yes", label: "YES", probability: 52 },
        { id: "no", label: "NO", probability: 48 },
      ],
      volume: "$298K",
      totalPool: "$118,400",
      expiry: "Today close",
      isBinary: true,
      oracleSource: "Chainlink ETH/USD",
      timeframe: "1 DAY",
      status: "Open",
      roundId: "ETH-TT-1002",
      lockRule: "Threshold uses the ETH/USD daily open snapshot.",
      closeRule: "Close snapshot is captured at the end of the same UTC day.",
      resolutionFormula: "YES wins if the final oracle price is at or above 4,220 at today's close.",
      invalidationRule: "Refund if the close snapshot cannot be captured from the supported oracle feed.",
      settlementLabel: "Machine-settled on Solana",
      assetSymbol: "ETH",
      assetName: "Ethereum",
      timeBucket: "Today",
      schedule: "Daily",
      narrativeFamily: "Above Daily Open",
      stateCategory: "Open",
      thresholdLabel: "Daily open",
      thresholdValue: 4220,
      currentPrice: 4189,
      distancePct: 0.74,
      endAtDate: buildDate(base, 8),
      endAt: "",
      yesPoolValue: 61200,
      noPoolValue: 57200,
      isFeaturedDiscovery: false,
      featuredNote: "Balanced ETH setup with a small gap to reclaim the opening print.",
      ruleText: "YES wins if the final oracle price is at or above 4,220 at today's close.",
      heroTag: "Above daily open",
    },
    {
      id: "sol-daily-yesterday-close",
      title: "SOL at or above yesterday close by today close",
      description: "Compact daily narrative with a smaller threshold gap and more aggressive YES positioning.",
      category: "Threshold",
      primitive: "Threshold",
      marketType: "Daily threshold",
      icon: "token",
      iconColor: "text-violet-400",
      outcomes: [
        { id: "yes", label: "YES", probability: 61 },
        { id: "no", label: "NO", probability: 39 },
      ],
      volume: "$184K",
      totalPool: "$76,300",
      expiry: "Today close",
      isBinary: true,
      oracleSource: "Chainlink SOL/USD",
      timeframe: "1 DAY",
      status: "Open",
      roundId: "SOL-TT-1003",
      lockRule: "Threshold is anchored to the previous SOL daily close.",
      closeRule: "Final value settles from the official end-of-day oracle update.",
      resolutionFormula: "YES wins if the final oracle price is at or above 196 at today's close.",
      invalidationRule: "Refund if the final oracle value is stale beyond protocol limits.",
      settlementLabel: "Machine-settled on Solana",
      assetSymbol: "SOL",
      assetName: "Solana",
      timeBucket: "Ending Soon",
      schedule: "Daily",
      narrativeFamily: "Above Yesterday Close",
      stateCategory: "Open",
      thresholdLabel: "Yesterday close",
      thresholdValue: 196,
      currentPrice: 195.4,
      distancePct: 0.31,
      endAtDate: buildDate(base, 2.5),
      endAt: "",
      yesPoolValue: 46200,
      noPoolValue: 30100,
      isFeaturedDiscovery: true,
      featuredNote: "Nearest daily finish and one of the cleanest urgency cards.",
      ruleText: "YES wins if the final oracle price is at or above 196 at today's close.",
      heroTag: "Ending soon",
    },
    {
      id: "btc-weekly-open",
      title: "BTC at or above weekly open by Sunday close",
      description: "Longer-horizon breakout framing for users who want a weekly narrative instead of an intraday timer.",
      category: "Threshold",
      primitive: "Threshold",
      marketType: "Weekly threshold",
      icon: "calendar_month",
      iconColor: "text-amber-500",
      outcomes: [
        { id: "yes", label: "YES", probability: 48 },
        { id: "no", label: "NO", probability: 52 },
      ],
      volume: "$506K",
      totalPool: "$212,500",
      expiry: "Sunday close",
      isBinary: true,
      oracleSource: "Chainlink BTC/USD",
      timeframe: "1 WEEK",
      status: "Open",
      roundId: "BTC-TT-2001",
      lockRule: "Threshold is fixed from the weekly open snapshot.",
      closeRule: "Settlement uses the Sunday close oracle read.",
      resolutionFormula: "YES wins if the final oracle price is at or above 109,800 at Sunday close.",
      invalidationRule: "Refund if the weekly close cannot be persisted from the supported oracle source.",
      settlementLabel: "Machine-settled on Solana",
      assetSymbol: "BTC",
      assetName: "Bitcoin",
      timeBucket: "This Week",
      schedule: "Weekly",
      narrativeFamily: "Weekly Breakout Watch",
      stateCategory: "Open",
      thresholdLabel: "Weekly open",
      thresholdValue: 109800,
      currentPrice: 107960,
      distancePct: 1.70,
      endAtDate: buildDate(base, 92),
      endAt: "",
      yesPoolValue: 89400,
      noPoolValue: 123100,
      isFeaturedDiscovery: true,
      featuredNote: "The flagship weekly BTC threshold for breakout-watch behavior.",
      ruleText: "YES wins if the final oracle price is at or above 109,800 at Sunday close.",
      heroTag: "Weekly breakout watch",
    },
    {
      id: "eth-weekly-below-open",
      title: "ETH below weekly open by Sunday close",
      description: "Inverse threshold framing that gives the page a sharper narrative contrast than all-upside cards.",
      category: "Threshold",
      primitive: "Threshold",
      marketType: "Weekly threshold",
      icon: "south",
      iconColor: "text-sky-400",
      outcomes: [
        { id: "yes", label: "YES", probability: 54 },
        { id: "no", label: "NO", probability: 46 },
      ],
      volume: "$264K",
      totalPool: "$101,700",
      expiry: "Sunday close",
      isBinary: true,
      oracleSource: "Chainlink ETH/USD",
      timeframe: "1 WEEK",
      status: "Open",
      roundId: "ETH-TT-2002",
      lockRule: "Weekly open threshold is fixed at the start of the weekly interval.",
      closeRule: "Settlement compares the final Sunday close against that stored threshold.",
      resolutionFormula: "YES wins if the final oracle price is below 4,260 at Sunday close.",
      invalidationRule: "Refund if the weekly close read is missing or stale.",
      settlementLabel: "Machine-settled on Solana",
      assetSymbol: "ETH",
      assetName: "Ethereum",
      timeBucket: "This Week",
      schedule: "Weekly",
      narrativeFamily: "Below Weekly Open",
      stateCategory: "Open",
      thresholdLabel: "Weekly open",
      thresholdValue: 4260,
      currentPrice: 4189,
      distancePct: -1.67,
      endAtDate: buildDate(base, 92),
      endAt: "",
      yesPoolValue: 58700,
      noPoolValue: 43000,
      isFeaturedDiscovery: false,
      featuredNote: "A clean bearish weekly frame for ETH with explicit downside semantics.",
      ruleText: "YES wins if the final oracle price is below 4,260 at Sunday close.",
      heroTag: "Below weekly open",
    },
    {
      id: "sol-weekly-open",
      title: "SOL at or above weekly open by Sunday close",
      description: "Higher-beta weekly threshold that reads like a breakout watch, not a generic directional bet.",
      category: "Threshold",
      primitive: "Threshold",
      marketType: "Weekly threshold",
      icon: "trending_up",
      iconColor: "text-violet-400",
      outcomes: [
        { id: "yes", label: "YES", probability: 58 },
        { id: "no", label: "NO", probability: 42 },
      ],
      volume: "$221K",
      totalPool: "$84,900",
      expiry: "Sunday close",
      isBinary: true,
      oracleSource: "Chainlink SOL/USD",
      timeframe: "1 WEEK",
      status: "Open",
      roundId: "SOL-TT-2003",
      lockRule: "The weekly open snapshot becomes the fixed threshold for the full contract.",
      closeRule: "Resolution uses the closing oracle print at the weekly cutoff.",
      resolutionFormula: "YES wins if the final oracle price is at or above 193 at Sunday close.",
      invalidationRule: "Refund if the protocol cannot capture a valid weekly close snapshot.",
      settlementLabel: "Machine-settled on Solana",
      assetSymbol: "SOL",
      assetName: "Solana",
      timeBucket: "This Week",
      schedule: "Weekly",
      narrativeFamily: "Weekly Breakout Watch",
      stateCategory: "Resolving",
      thresholdLabel: "Weekly open",
      thresholdValue: 193,
      currentPrice: 195.4,
      distancePct: 1.24,
      endAtDate: buildDate(base, 20),
      endAt: "",
      yesPoolValue: 51200,
      noPoolValue: 33700,
      isFeaturedDiscovery: true,
      featuredNote: "Strong momentum card with a visible cushion above threshold.",
      ruleText: "YES wins if the final oracle price is at or above 193 at Sunday close.",
      heroTag: "Momentum setup",
    },
    {
      id: "btc-daily-open-locked",
      title: "BTC at or above daily open by today close",
      description: "Locked threshold example surfaced for state awareness and late-day tracking behavior.",
      category: "Threshold",
      primitive: "Threshold",
      marketType: "Daily threshold",
      icon: "lock",
      iconColor: "text-amber-500",
      outcomes: [
        { id: "yes", label: "YES", probability: 49 },
        { id: "no", label: "NO", probability: 51 },
      ],
      volume: "$338K",
      totalPool: "$133,600",
      expiry: "Today close",
      isBinary: true,
      oracleSource: "Chainlink BTC/USD",
      timeframe: "1 DAY",
      status: "Locked",
      roundId: "BTC-TT-1004",
      lockRule: "Entry is closed and the threshold remains fixed for settlement.",
      closeRule: "Only the final daily close matters now.",
      resolutionFormula: "YES wins if the final oracle price is at or above 108,150 at today's close.",
      invalidationRule: "Refund if the final close read cannot be captured from the oracle.",
      settlementLabel: "Machine-settled on Solana",
      assetSymbol: "BTC",
      assetName: "Bitcoin",
      timeBucket: "Ending Soon",
      schedule: "Daily",
      narrativeFamily: "Above Daily Open",
      stateCategory: "Locked",
      thresholdLabel: "Daily open",
      thresholdValue: 108150,
      currentPrice: 107960,
      distancePct: 0.18,
      endAtDate: buildDate(base, 1.2),
      endAt: "",
      yesPoolValue: 60400,
      noPoolValue: 73200,
      isFeaturedDiscovery: false,
      featuredNote: "Useful late-session tracker card even after entry is closed.",
      ruleText: "YES wins if the final oracle price is at or above 108,150 at today's close.",
      heroTag: "Locked market",
    },
    {
      id: "eth-daily-yesterday-close",
      title: "ETH at or above yesterday close by today close",
      description: "A reclaim-style ETH daily market with a familiar reference line and tighter close behavior.",
      category: "Threshold",
      primitive: "Threshold",
      marketType: "Daily threshold",
      icon: "history",
      iconColor: "text-sky-400",
      outcomes: [
        { id: "yes", label: "YES", probability: 54 },
        { id: "no", label: "NO", probability: 46 },
      ],
      volume: "$246K",
      totalPool: "$109,800",
      expiry: "Today close",
      isBinary: true,
      oracleSource: "Chainlink ETH/USD",
      timeframe: "1 DAY",
      status: "Open",
      roundId: "ETH-TT-1005",
      lockRule: "Threshold is anchored to ETH's previous daily close.",
      closeRule: "Only the final end-of-day close settles the market.",
      resolutionFormula: "YES wins if the final oracle price is at or above 4,205 at today's close.",
      invalidationRule: "Refund if the close snapshot cannot be captured from the supported oracle feed.",
      settlementLabel: "Machine-settled on Solana",
      assetSymbol: "ETH",
      assetName: "Ethereum",
      timeBucket: "Today",
      schedule: "Daily",
      narrativeFamily: "Above Yesterday Close",
      stateCategory: "Open",
      thresholdLabel: "Yesterday close",
      thresholdValue: 4205,
      currentPrice: 4189,
      distancePct: 0.38,
      endAtDate: buildDate(base, 8),
      endAt: "",
      yesPoolValue: 59200,
      noPoolValue: 50600,
      isFeaturedDiscovery: true,
      featuredNote: "ETH reclaim setup with straightforward threshold framing.",
      ruleText: "YES wins if the final oracle price is at or above 4,205 at today's close.",
      heroTag: "Reclaim watch",
    },
    {
      id: "sol-daily-open",
      title: "SOL at or above daily open by today close",
      description: "Daily SOL threshold built for shorter attention spans and tighter intraday movement.",
      category: "Threshold",
      primitive: "Threshold",
      marketType: "Daily threshold",
      icon: "bolt",
      iconColor: "text-violet-400",
      outcomes: [
        { id: "yes", label: "YES", probability: 53 },
        { id: "no", label: "NO", probability: 47 },
      ],
      volume: "$172K",
      totalPool: "$81,200",
      expiry: "Today close",
      isBinary: true,
      oracleSource: "Chainlink SOL/USD",
      timeframe: "1 DAY",
      status: "Open",
      roundId: "SOL-TT-1006",
      lockRule: "Threshold is fixed using SOL's daily open snapshot.",
      closeRule: "Resolution compares the close against the stored daily open.",
      resolutionFormula: "YES wins if the final oracle price is at or above 194.5 at today's close.",
      invalidationRule: "Refund if the protocol cannot capture a valid close snapshot.",
      settlementLabel: "Machine-settled on Solana",
      assetSymbol: "SOL",
      assetName: "Solana",
      timeBucket: "Today",
      schedule: "Daily",
      narrativeFamily: "Above Daily Open",
      stateCategory: "Open",
      thresholdLabel: "Daily open",
      thresholdValue: 194.5,
      currentPrice: 195.4,
      distancePct: 0.46,
      endAtDate: buildDate(base, 8),
      endAt: "",
      yesPoolValue: 43100,
      noPoolValue: 38100,
      isFeaturedDiscovery: false,
      featuredNote: "Fast SOL open-to-close threshold for quick scanning.",
      ruleText: "YES wins if the final oracle price is at or above 194.5 at today's close.",
      heroTag: "Open reclaim",
    },
    {
      id: "btc-yesterday-close-locked",
      title: "BTC at or above yesterday close by today close",
      description: "A locked reclaim market for users who only want to track the settlement path.",
      category: "Threshold",
      primitive: "Threshold",
      marketType: "Daily threshold",
      icon: "lock_clock",
      iconColor: "text-amber-500",
      outcomes: [
        { id: "yes", label: "YES", probability: 57 },
        { id: "no", label: "NO", probability: 43 },
      ],
      volume: "$288K",
      totalPool: "$126,400",
      expiry: "Today close",
      isBinary: true,
      oracleSource: "Chainlink BTC/USD",
      timeframe: "1 DAY",
      status: "Locked",
      roundId: "BTC-TT-1007",
      lockRule: "Entry is closed while the previous close remains the settlement threshold.",
      closeRule: "The end-of-day close settles the result.",
      resolutionFormula: "YES wins if the final oracle price is at or above 108,320 at today's close.",
      invalidationRule: "Refund if a valid close snapshot is unavailable.",
      settlementLabel: "Machine-settled on Solana",
      assetSymbol: "BTC",
      assetName: "Bitcoin",
      timeBucket: "Ending Soon",
      schedule: "Daily",
      narrativeFamily: "Above Yesterday Close",
      stateCategory: "Locked",
      thresholdLabel: "Yesterday close",
      thresholdValue: 108320,
      currentPrice: 107960,
      distancePct: 0.33,
      endAtDate: buildDate(base, 1.6),
      endAt: "",
      yesPoolValue: 72100,
      noPoolValue: 54300,
      isFeaturedDiscovery: false,
      featuredNote: "Late-session BTC tracker with entry already closed.",
      ruleText: "YES wins if the final oracle price is at or above 108,320 at today's close.",
      heroTag: "Locked tracker",
    },
    {
      id: "eth-daily-open-locked",
      title: "ETH at or above daily open by today close",
      description: "Locked ETH open-to-close threshold for users who arrive after trading closes.",
      category: "Threshold",
      primitive: "Threshold",
      marketType: "Daily threshold",
      icon: "schedule",
      iconColor: "text-sky-400",
      outcomes: [
        { id: "yes", label: "YES", probability: 49 },
        { id: "no", label: "NO", probability: 51 },
      ],
      volume: "$192K",
      totalPool: "$88,900",
      expiry: "Today close",
      isBinary: true,
      oracleSource: "Chainlink ETH/USD",
      timeframe: "1 DAY",
      status: "Locked",
      roundId: "ETH-TT-1008",
      lockRule: "Threshold is fixed from the ETH daily open and entry is closed.",
      closeRule: "Only the official daily close matters now.",
      resolutionFormula: "YES wins if the final oracle price is at or above 4,214 at today's close.",
      invalidationRule: "Refund if the oracle close is stale or unavailable.",
      settlementLabel: "Machine-settled on Solana",
      assetSymbol: "ETH",
      assetName: "Ethereum",
      timeBucket: "Ending Soon",
      schedule: "Daily",
      narrativeFamily: "Above Daily Open",
      stateCategory: "Locked",
      thresholdLabel: "Daily open",
      thresholdValue: 4214,
      currentPrice: 4189,
      distancePct: 0.59,
      endAtDate: buildDate(base, 1.8),
      endAt: "",
      yesPoolValue: 44100,
      noPoolValue: 44800,
      isFeaturedDiscovery: false,
      featuredNote: "Balanced ETH lock-state card near the finish line.",
      ruleText: "YES wins if the final oracle price is at or above 4,214 at today's close.",
      heroTag: "Closing soon",
    },
    {
      id: "sol-yesterday-close-resolving",
      title: "SOL at or above yesterday close by today close",
      description: "Resolving SOL reclaim market for users watching settlement rather than entry.",
      category: "Threshold",
      primitive: "Threshold",
      marketType: "Daily threshold",
      icon: "hourglass_bottom",
      iconColor: "text-violet-400",
      outcomes: [
        { id: "yes", label: "YES", probability: 60 },
        { id: "no", label: "NO", probability: 40 },
      ],
      volume: "$158K",
      totalPool: "$73,100",
      expiry: "Today close",
      isBinary: true,
      oracleSource: "Chainlink SOL/USD",
      timeframe: "1 DAY",
      status: "Resolving",
      roundId: "SOL-TT-1009",
      lockRule: "The previous SOL close remains the only threshold reference.",
      closeRule: "Settlement is waiting on the final oracle close.",
      resolutionFormula: "YES wins if the final oracle price is at or above 195.8 at today's close.",
      invalidationRule: "Refund if a valid close cannot be persisted.",
      settlementLabel: "Machine-settled on Solana",
      assetSymbol: "SOL",
      assetName: "Solana",
      timeBucket: "Ending Soon",
      schedule: "Daily",
      narrativeFamily: "Above Yesterday Close",
      stateCategory: "Resolving",
      thresholdLabel: "Yesterday close",
      thresholdValue: 195.8,
      currentPrice: 195.4,
      distancePct: 0.20,
      endAtDate: buildDate(base, 0.9),
      endAt: "",
      yesPoolValue: 43800,
      noPoolValue: 29300,
      isFeaturedDiscovery: false,
      featuredNote: "Resolving-state SOL threshold with a tight finish.",
      ruleText: "YES wins if the final oracle price is at or above 195.8 at today's close.",
      heroTag: "Resolving now",
    },
    {
      id: "eth-weekly-breakout",
      title: "ETH at or above weekly open by Sunday close",
      description: "Weekly breakout framing for ETH users who want longer-horizon conviction than daily markets.",
      category: "Threshold",
      primitive: "Threshold",
      marketType: "Weekly threshold",
      icon: "north_east",
      iconColor: "text-sky-400",
      outcomes: [
        { id: "yes", label: "YES", probability: 47 },
        { id: "no", label: "NO", probability: 53 },
      ],
      volume: "$302K",
      totalPool: "$119,600",
      expiry: "Sunday close",
      isBinary: true,
      oracleSource: "Chainlink ETH/USD",
      timeframe: "1 WEEK",
      status: "Open",
      roundId: "ETH-TT-2004",
      lockRule: "Threshold is fixed from ETH's weekly open snapshot.",
      closeRule: "Sunday close determines whether the open has been reclaimed.",
      resolutionFormula: "YES wins if the final oracle price is at or above 4,255 at Sunday close.",
      invalidationRule: "Refund if the weekly close is stale or unavailable.",
      settlementLabel: "Machine-settled on Solana",
      assetSymbol: "ETH",
      assetName: "Ethereum",
      timeBucket: "This Week",
      schedule: "Weekly",
      narrativeFamily: "Weekly Breakout Watch",
      stateCategory: "Open",
      thresholdLabel: "Weekly open",
      thresholdValue: 4255,
      currentPrice: 4189,
      distancePct: 1.55,
      endAtDate: buildDate(base, 92),
      endAt: "",
      yesPoolValue: 55400,
      noPoolValue: 64200,
      isFeaturedDiscovery: true,
      featuredNote: "ETH weekly reclaim card for breakout-watch behavior.",
      ruleText: "YES wins if the final oracle price is at or above 4,255 at Sunday close.",
      heroTag: "Weekly breakout",
    },
    {
      id: "btc-below-weekly-open",
      title: "BTC below weekly open by Sunday close",
      description: "Bearish BTC weekly frame for users scanning below-open structures instead of reclaim stories.",
      category: "Threshold",
      primitive: "Threshold",
      marketType: "Weekly threshold",
      icon: "south_east",
      iconColor: "text-amber-500",
      outcomes: [
        { id: "yes", label: "YES", probability: 55 },
        { id: "no", label: "NO", probability: 45 },
      ],
      volume: "$274K",
      totalPool: "$117,300",
      expiry: "Sunday close",
      isBinary: true,
      oracleSource: "Chainlink BTC/USD",
      timeframe: "1 WEEK",
      status: "Open",
      roundId: "BTC-TT-2005",
      lockRule: "Weekly open is fixed at contract creation.",
      closeRule: "Sunday close decides whether BTC finished below the open.",
      resolutionFormula: "YES wins if the final oracle price is below 109,420 at Sunday close.",
      invalidationRule: "Refund if the weekly close cannot be captured.",
      settlementLabel: "Machine-settled on Solana",
      assetSymbol: "BTC",
      assetName: "Bitcoin",
      timeBucket: "This Week",
      schedule: "Weekly",
      narrativeFamily: "Below Weekly Open",
      stateCategory: "Open",
      thresholdLabel: "Weekly open",
      thresholdValue: 109420,
      currentPrice: 107960,
      distancePct: -1.33,
      endAtDate: buildDate(base, 92),
      endAt: "",
      yesPoolValue: 64600,
      noPoolValue: 52700,
      isFeaturedDiscovery: false,
      featuredNote: "Counter-trend weekly BTC frame built for bearish scanners.",
      ruleText: "YES wins if the final oracle price is below 109,420 at Sunday close.",
      heroTag: "Below weekly open",
    },
    {
      id: "sol-below-weekly-open",
      title: "SOL below weekly open by Sunday close",
      description: "Weekly SOL downside frame with higher beta and clearer failure-state semantics.",
      category: "Threshold",
      primitive: "Threshold",
      marketType: "Weekly threshold",
      icon: "trending_down",
      iconColor: "text-violet-400",
      outcomes: [
        { id: "yes", label: "YES", probability: 44 },
        { id: "no", label: "NO", probability: 56 },
      ],
      volume: "$182K",
      totalPool: "$79,400",
      expiry: "Sunday close",
      isBinary: true,
      oracleSource: "Chainlink SOL/USD",
      timeframe: "1 WEEK",
      status: "Open",
      roundId: "SOL-TT-2006",
      lockRule: "The weekly open snapshot remains fixed through settlement.",
      closeRule: "Sunday close determines the outcome.",
      resolutionFormula: "YES wins if the final oracle price is below 193.6 at Sunday close.",
      invalidationRule: "Refund if the weekly close is unavailable.",
      settlementLabel: "Machine-settled on Solana",
      assetSymbol: "SOL",
      assetName: "Solana",
      timeBucket: "This Week",
      schedule: "Weekly",
      narrativeFamily: "Below Weekly Open",
      stateCategory: "Open",
      thresholdLabel: "Weekly open",
      thresholdValue: 193.6,
      currentPrice: 195.4,
      distancePct: -0.92,
      endAtDate: buildDate(base, 92),
      endAt: "",
      yesPoolValue: 34900,
      noPoolValue: 44500,
      isFeaturedDiscovery: false,
      featuredNote: "Higher-beta downside weekly frame on SOL.",
      ruleText: "YES wins if the final oracle price is below 193.6 at Sunday close.",
      heroTag: "Failure watch",
    },
    {
      id: "eth-below-weekly-open-late",
      title: "ETH below weekly open by Sunday close",
      description: "Late-cycle weekly ETH downside market surfaced for urgency-first weekly scanning.",
      category: "Threshold",
      primitive: "Threshold",
      marketType: "Weekly threshold",
      icon: "event_busy",
      iconColor: "text-sky-400",
      outcomes: [
        { id: "yes", label: "YES", probability: 58 },
        { id: "no", label: "NO", probability: 42 },
      ],
      volume: "$214K",
      totalPool: "$98,500",
      expiry: "Sunday close",
      isBinary: true,
      oracleSource: "Chainlink ETH/USD",
      timeframe: "1 WEEK",
      status: "Resolving",
      roundId: "ETH-TT-2007",
      lockRule: "Weekly open threshold remains fixed after entry closes.",
      closeRule: "The final weekly close settles the market.",
      resolutionFormula: "YES wins if the final oracle price is below 4,248 at Sunday close.",
      invalidationRule: "Refund if the final weekly close is stale.",
      settlementLabel: "Machine-settled on Solana",
      assetSymbol: "ETH",
      assetName: "Ethereum",
      timeBucket: "Ending Soon",
      schedule: "Weekly",
      narrativeFamily: "Below Weekly Open",
      stateCategory: "Resolving",
      thresholdLabel: "Weekly open",
      thresholdValue: 4248,
      currentPrice: 4189,
      distancePct: -1.39,
      endAtDate: buildDate(base, 19.5),
      endAt: "",
      yesPoolValue: 56200,
      noPoolValue: 42300,
      isFeaturedDiscovery: false,
      featuredNote: "Late-phase weekly ETH downside frame in resolution.",
      ruleText: "YES wins if the final oracle price is below 4,248 at Sunday close.",
      heroTag: "Late weekly close",
    },
    {
      id: "btc-daily-open-live",
      title: "BTC at or above daily open by today close",
      description: "A live BTC open-to-close threshold positioned for quick daily scanning.",
      category: "Threshold",
      primitive: "Threshold",
      marketType: "Daily threshold",
      icon: "candlestick_chart",
      iconColor: "text-amber-500",
      outcomes: [
        { id: "yes", label: "YES", probability: 45 },
        { id: "no", label: "NO", probability: 55 },
      ],
      volume: "$301K",
      totalPool: "$129,700",
      expiry: "Today close",
      isBinary: true,
      oracleSource: "Chainlink BTC/USD",
      timeframe: "1 DAY",
      status: "Open",
      roundId: "BTC-TT-1010",
      lockRule: "Threshold is fixed using the BTC daily open snapshot.",
      closeRule: "The end-of-day close decides whether the open held.",
      resolutionFormula: "YES wins if the final oracle price is at or above 108,150 at today's close.",
      invalidationRule: "Refund if the close print is stale or unavailable.",
      settlementLabel: "Machine-settled on Solana",
      assetSymbol: "BTC",
      assetName: "Bitcoin",
      timeBucket: "Today",
      schedule: "Daily",
      narrativeFamily: "Above Daily Open",
      stateCategory: "Open",
      thresholdLabel: "Daily open",
      thresholdValue: 108150,
      currentPrice: 107960,
      distancePct: 0.18,
      endAtDate: buildDate(base, 8),
      endAt: "",
      yesPoolValue: 58400,
      noPoolValue: 71300,
      isFeaturedDiscovery: false,
      featuredNote: "Primary BTC intraday open-level card.",
      ruleText: "YES wins if the final oracle price is at or above 108,150 at today's close.",
      heroTag: "Daily open",
    },
    {
      id: "eth-yesterday-close-locked",
      title: "ETH at or above yesterday close by today close",
      description: "Late-session ETH reclaim market with entry closed and settlement still in play.",
      category: "Threshold",
      primitive: "Threshold",
      marketType: "Daily threshold",
      icon: "pending",
      iconColor: "text-sky-400",
      outcomes: [
        { id: "yes", label: "YES", probability: 53 },
        { id: "no", label: "NO", probability: 47 },
      ],
      volume: "$173K",
      totalPool: "$91,200",
      expiry: "Today close",
      isBinary: true,
      oracleSource: "Chainlink ETH/USD",
      timeframe: "1 DAY",
      status: "Locked",
      roundId: "ETH-TT-1011",
      lockRule: "Entry is closed while the previous ETH close remains fixed.",
      closeRule: "Settlement uses the final end-of-day ETH close.",
      resolutionFormula: "YES wins if the final oracle price is at or above 4,205 at today's close.",
      invalidationRule: "Refund if the closing oracle print is stale.",
      settlementLabel: "Machine-settled on Solana",
      assetSymbol: "ETH",
      assetName: "Ethereum",
      timeBucket: "Ending Soon",
      schedule: "Daily",
      narrativeFamily: "Above Yesterday Close",
      stateCategory: "Locked",
      thresholdLabel: "Yesterday close",
      thresholdValue: 4205,
      currentPrice: 4189,
      distancePct: 0.38,
      endAtDate: buildDate(base, 1.4),
      endAt: "",
      yesPoolValue: 46300,
      noPoolValue: 44900,
      isFeaturedDiscovery: false,
      featuredNote: "ETH reclaim tracker for late-arriving users.",
      ruleText: "YES wins if the final oracle price is at or above 4,205 at today's close.",
      heroTag: "Late reclaim",
    },
    {
      id: "btc-below-weekly-open-late",
      title: "BTC below weekly open by Sunday close",
      description: "Late-cycle BTC downside weekly market emphasizing urgency over discovery breadth.",
      category: "Threshold",
      primitive: "Threshold",
      marketType: "Weekly threshold",
      icon: "warning",
      iconColor: "text-amber-500",
      outcomes: [
        { id: "yes", label: "YES", probability: 57 },
        { id: "no", label: "NO", probability: 43 },
      ],
      volume: "$219K",
      totalPool: "$106,800",
      expiry: "Sunday close",
      isBinary: true,
      oracleSource: "Chainlink BTC/USD",
      timeframe: "1 WEEK",
      status: "Resolving",
      roundId: "BTC-TT-2008",
      lockRule: "Weekly open remains fixed after entry is closed.",
      closeRule: "Sunday close settles whether BTC finished below the open.",
      resolutionFormula: "YES wins if the final oracle price is below 109,420 at Sunday close.",
      invalidationRule: "Refund if the weekly close is stale.",
      settlementLabel: "Machine-settled on Solana",
      assetSymbol: "BTC",
      assetName: "Bitcoin",
      timeBucket: "Ending Soon",
      schedule: "Weekly",
      narrativeFamily: "Below Weekly Open",
      stateCategory: "Resolving",
      thresholdLabel: "Weekly open",
      thresholdValue: 109420,
      currentPrice: 107960,
      distancePct: -1.33,
      endAtDate: buildDate(base, 18.4),
      endAt: "",
      yesPoolValue: 60100,
      noPoolValue: 46700,
      isFeaturedDiscovery: false,
      featuredNote: "Urgent BTC downside weekly frame.",
      ruleText: "YES wins if the final oracle price is below 109,420 at Sunday close.",
      heroTag: "Late weekly downside",
    },
    {
      id: "sol-below-weekly-open-late",
      title: "SOL below weekly open by Sunday close",
      description: "Late weekly SOL downside threshold that complements the more optimistic breakout cards.",
      category: "Threshold",
      primitive: "Threshold",
      marketType: "Weekly threshold",
      icon: "signal_cellular_alt",
      iconColor: "text-violet-400",
      outcomes: [
        { id: "yes", label: "YES", probability: 46 },
        { id: "no", label: "NO", probability: 54 },
      ],
      volume: "$144K",
      totalPool: "$68,500",
      expiry: "Sunday close",
      isBinary: true,
      oracleSource: "Chainlink SOL/USD",
      timeframe: "1 WEEK",
      status: "Resolving",
      roundId: "SOL-TT-2009",
      lockRule: "Weekly open remains the fixed reference into settlement.",
      closeRule: "Sunday close determines the final result.",
      resolutionFormula: "YES wins if the final oracle price is below 193.6 at Sunday close.",
      invalidationRule: "Refund if a valid close is unavailable.",
      settlementLabel: "Machine-settled on Solana",
      assetSymbol: "SOL",
      assetName: "Solana",
      timeBucket: "Ending Soon",
      schedule: "Weekly",
      narrativeFamily: "Below Weekly Open",
      stateCategory: "Resolving",
      thresholdLabel: "Weekly open",
      thresholdValue: 193.6,
      currentPrice: 195.4,
      distancePct: -0.92,
      endAtDate: buildDate(base, 18.1),
      endAt: "",
      yesPoolValue: 30800,
      noPoolValue: 37700,
      isFeaturedDiscovery: false,
      featuredNote: "Urgent weekly downside SOL card.",
      ruleText: "YES wins if the final oracle price is below 193.6 at Sunday close.",
      heroTag: "Late weekly downside",
    },
  ];

  return raw.map((market) => ({
    ...market,
    endAt: market.endAtDate.toISOString(),
    countdownLabel: formatCountdown(market.endAtDate.toISOString(), nowMs),
  }));
}

function DiscoveryMarketCard({
  market,
  onOpen,
}: {
  market: DiscoveryMarket;
  onOpen: (market: DiscoveryMarket) => void;
}) {
  const totalPool = market.yesPoolValue + market.noPoolValue;
  const yesShare = (market.yesPoolValue / totalPool) * 100;
  const noShare = 100 - yesShare;
  const yesPct = Math.round(yesShare);
  const noPct = Math.round(noShare);
  const style = discoveryStatusStyles[market.stateCategory];

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen(market)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(market);
        }
      }}
      className={cn(
        "group relative flex cursor-pointer flex-col overflow-hidden rounded-[26px] border text-left outline-none transition-all duration-200",
        "border-[#222b35] bg-[#161c22] text-white shadow-[0_18px_40px_-28px_rgba(0,0,0,0.65)]",
        "hover:-translate-y-0.5 hover:border-[#2f3a46] hover:bg-[#192028] hover:shadow-[0_28px_60px_-32px_rgba(0,0,0,0.78)]",
        "focus-visible:ring-2 focus-visible:ring-emerald-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
    >
      <div className="relative flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <AssetLogo symbol={market.assetSymbol} className="size-11 shrink-0 rounded-xl border border-white/8 bg-white/5 p-1.5" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="truncate text-sm font-semibold tracking-tight text-white">{market.assetName}</span>
                <span className="text-xs font-semibold text-white/45">{market.assetSymbol}</span>
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                    style.badge,
                  )}
                >
                  {market.stateCategory}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] font-medium tabular-nums text-white/48 sm:text-xs">
                {market.countdownLabel}
              </p>
            </div>
          </div>
          <span
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/8 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/62"
            title="Settled on Solana"
          >
            <span className="size-1.5 rounded-full bg-gradient-to-br from-[#9945FF] to-[#14F195]" aria-hidden />
            Solana
          </span>
        </div>

        <h3 className="mt-4 line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight text-white sm:text-[17px]">
          {market.title}
        </h3>
        <p className="mt-2 line-clamp-1 text-sm text-white/50">
          {market.narrativeFamily}
        </p>

        <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/6 bg-black/10 px-3 py-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/36">Chance</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-white">{yesPct}%</p>
          </div>
          <div className="flex h-2.5 w-28 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-[#22c55e] transition-[width] duration-300"
              style={{ width: `${yesPct}%` }}
            />
            <div
              className="h-full bg-[#ef4444] transition-[width] duration-300"
              style={{ width: `${noPct}%` }}
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpen(market);
            }}
            className="rounded-2xl border border-[#1f4e39] bg-[#193629] px-3 py-3 text-left transition-colors hover:border-[#2b6b4f] hover:bg-[#1f4231]"
          >
            <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6dd3a1]">Yes</span>
            <span className="mt-1 block text-lg font-bold tabular-nums text-[#7df0b6]">{yesPct}%</span>
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpen(market);
            }}
            className="rounded-2xl border border-[#5a2629] bg-[#3b2427] px-3 py-3 text-left transition-colors hover:border-[#773439] hover:bg-[#47292d]"
          >
            <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ff7f84]">No</span>
            <span className="mt-1 block text-lg font-bold tabular-nums text-[#ff9fa3]">{noPct}%</span>
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-white/6 pt-3">
          <div>
            <span className="block text-sm font-medium text-white/78">{market.volume} Vol.</span>
            <span className="mt-0.5 block text-xs text-white/38">{thresholdSubtitle(market)}</span>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-white/78 transition-colors group-hover:text-white">
            View market
            <ArrowUpRight className="size-3.5 opacity-70" aria-hidden />
          </span>
        </div>
      </div>
    </article>
  );
}

function DiscoverSidebar({
  trendingMarkets,
  onOpenUpDown,
  onOpen,
}: {
  trendingMarkets: DiscoveryMarket[];
  onOpenUpDown: () => void;
  onOpen: (market: DiscoveryMarket) => void;
}) {
  const list = trendingMarkets.slice(0, 7);

  return (
    <aside className="w-full space-y-5 lg:sticky lg:top-28 lg:w-80">
      {/* Kalshi-style promo strip */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-950 p-4 text-white shadow-lg ring-1 ring-emerald-500/25">
        <div
          className="pointer-events-none absolute -right-6 -top-6 size-28 rounded-full bg-emerald-400/15 blur-2xl"
          aria-hidden
        />
        <p className="relative text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-200/80">
          Crypto thresholds
        </p>
        <h2 className="relative mt-2 text-lg font-bold leading-tight tracking-tight">Up or Down</h2>
        <p className="relative mt-1 text-xs leading-relaxed text-emerald-100/75">
          Short intraday markets on Solana
        </p>
        <div className="relative mt-4 flex justify-center">
          <div className="flex gap-1 rounded-full bg-emerald-500/20 px-3 py-2 ring-1 ring-emerald-400/20">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="size-2 rounded-full bg-emerald-400/90 shadow-[0_0_12px_rgba(52,211,153,0.7)]"
                style={{ opacity: 0.35 + i * 0.13 }}
                aria-hidden
              />
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenUpDown}
          className="relative mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-sm font-semibold text-emerald-950 shadow-sm transition hover:bg-emerald-50"
        >
          Trade now
          <ChevronRight className="size-4 opacity-70" aria-hidden />
        </button>
      </div>

      {/* Trending — numbered rows, question + level, % + skew */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border/70 px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-foreground">Trending</span>
            <TrendingUp className="size-3.5 text-emerald-500" aria-hidden />
          </div>
          <ChevronRight className="size-4 text-muted-foreground/60" aria-hidden />
        </div>
        <ul className="divide-y divide-border/60">
          {list.map((market, index) => {
            const yesPct = yesPercentFromPools(market);
            const yesProb = market.outcomes.find((o) => o.id === "yes")?.probability ?? yesPct;
            const skew = Math.round(yesProb - 50);
            const trendUp = skew >= 0;
            return (
              <li key={market.id}>
                <button
                  type="button"
                  onClick={() => onOpen(market)}
                  className="flex w-full gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/40"
                >
                  <span className="w-5 shrink-0 pt-0.5 text-center text-[13px] font-medium tabular-nums text-muted-foreground">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-foreground">{market.title}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{thresholdSubtitle(market)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[15px] font-semibold tabular-nums text-foreground">{yesProb}%</div>
                    <div
                      className={cn(
                        "mt-0.5 flex items-center justify-end gap-0.5 text-[11px] font-semibold tabular-nums",
                        trendUp ? "text-emerald-500" : "text-rose-500",
                      )}
                    >
                      <span aria-hidden>{trendUp ? "▲" : "▼"}</span>
                      {Math.abs(skew)}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}

const MarketsAll = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<DiscoveryTab>("All");
  const [assetFilter, setAssetFilter] = useState<AssetFilter>("All assets");
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => setNowMs(Date.now()), 60000);
    return () => window.clearInterval(intervalId);
  }, []);

  const discoveryMarkets = getDiscoveryMarkets(nowMs);

  let filteredMarkets = discoveryMarkets.filter((market) => {
    if (activeTab === "Today" && market.timeBucket !== "Today") return false;
    if (activeTab === "This Week" && market.timeBucket !== "This Week") return false;
    if (activeTab === "Ending Soon" && market.timeBucket !== "Ending Soon") return false;
    if (activeTab === "Featured" && !market.isFeaturedDiscovery) return false;
    if (assetFilter !== "All assets" && market.assetSymbol !== assetFilter) return false;

    return true;
  });

  filteredMarkets = [...filteredMarkets].sort((a, b) => {
    if (a.isFeaturedDiscovery === b.isFeaturedDiscovery) {
      return new Date(a.endAt).getTime() - new Date(b.endAt).getTime();
    }
    return a.isFeaturedDiscovery ? -1 : 1;
  });
  const trendingMarkets = [...(filteredMarkets.length > 0 ? filteredMarkets : discoveryMarkets)]
    .sort((a, b) => b.yesPoolValue + b.noPoolValue - (a.yesPoolValue + a.noPoolValue))
    .slice(0, 7);
  const openMarket = (market: DiscoveryMarket) => {
    navigate(`/app/market/${market.id}`, { state: { market: market as Market } });
  };

  const openUpDownMarket = () => {
    navigate("/app/markets/updown/crypto");
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <Header
        discoveryNav={{
          tabs: TABS,
          activeTab,
          onTabChange: (tab) => setActiveTab(tab as DiscoveryTab),
          assetFilter,
          onAssetFilterChange: (value) => setAssetFilter(value as AssetFilter),
        }}
      />

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-4 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
          <section className="min-w-0 flex-1">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredMarkets.map((market) => (
                <DiscoveryMarketCard key={market.id} market={market} onOpen={openMarket} />
              ))}
            </div>
          </section>

          <div className="shrink-0 lg:w-80">
            <DiscoverSidebar
              trendingMarkets={trendingMarkets}
              onOpenUpDown={openUpDownMarket}
              onOpen={openMarket}
            />
          </div>
        </div>

        {filteredMarkets.length === 0 && (
          <section className="mt-8 rounded-lg border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
            <h2 className="text-lg font-semibold text-foreground">No markets match</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Try a different time tab or set the header asset filter to All assets.
            </p>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default MarketsAll;
