import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Search, TrendingUp } from "lucide-react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { AssetLogo } from "@/components/AssetLogo";
import { cn } from "@/lib/utils";
import { Market } from "@/types/market";

type DiscoveryTab = "All" | "Today" | "This Week" | "Ending Soon" | "Featured" | "My Positions";
type AssetFilter = "All assets" | string;
type ScheduleFilter = "All schedules" | "Daily" | "Weekly";
type NarrativeFilter =
  | "All narratives"
  | "Above Yesterday Close"
  | "Above Daily Open"
  | "Below Weekly Open"
  | "Weekly Breakout Watch";
type StateFilter = "All states" | "Open" | "Locked" | "Resolving";
type SortFilter = "Featured first" | "Ending soon" | "Closest to threshold" | "Largest pool";

type DiscoveryMarket = Market & {
  assetSymbol: "BTC" | "ETH" | "SOL";
  assetName: string;
  timeBucket: "Today" | "This Week" | "Ending Soon";
  schedule: "Daily" | "Weekly";
  narrativeFamily: Exclude<NarrativeFilter, "All narratives">;
  stateCategory: Exclude<StateFilter, "All states">;
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
const ASSET_FILTERS: AssetFilter[] = ["All assets", "BTC", "ETH", "SOL"];
const SCHEDULE_FILTERS: ScheduleFilter[] = ["All schedules", "Daily", "Weekly"];
const NARRATIVE_FILTERS: NarrativeFilter[] = [
  "All narratives",
  "Above Yesterday Close",
  "Above Daily Open",
  "Below Weekly Open",
  "Weekly Breakout Watch",
];
const STATE_FILTERS: StateFilter[] = ["All states", "Open", "Locked", "Resolving"];
const SORT_FILTERS: SortFilter[] = ["Featured first", "Ending soon", "Closest to threshold", "Largest pool"];
const FEATURED_MARKET_IDS = [
  "btc-daily-yesterday-close",
  "sol-daily-yesterday-close",
  "btc-weekly-open",
  "sol-weekly-open",
  "eth-daily-yesterday-close",
  "eth-weekly-breakout",
];

const discoveryStatusStyles: Record<
  DiscoveryMarket["stateCategory"],
  {
    badge: string;
  }
> = {
  Open: {
    badge: "border-emerald-500/18 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  },
  Locked: {
    badge: "border-amber-500/18 bg-amber-500/10 text-amber-600 dark:text-amber-300",
  },
  Resolving: {
    badge: "border-sky-500/18 bg-sky-500/10 text-sky-600 dark:text-sky-300",
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

function MarketListRow({
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
      onClick={() => onOpen(market)}
      className="group flex cursor-pointer flex-col gap-3 border-b border-border py-4 pl-1 pr-1 text-left transition-colors last:border-b-0 hover:bg-muted/25 sm:flex-row sm:items-center sm:gap-4 sm:py-5"
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <AssetLogo symbol={market.assetSymbol} className="size-9 shrink-0 sm:size-10" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", style.badge)}>
              {market.stateCategory}
            </span>
            <span className="text-xs text-muted-foreground">
              {market.assetSymbol} · {market.countdownLabel}
            </span>
          </div>
          <h3 className="mt-1.5 text-[15px] font-medium leading-snug text-foreground sm:text-base">{market.title}</h3>
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
            {formatCompactCurrency(totalPool)} vol · {market.narrativeFamily}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:pl-2">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpen(market);
          }}
          className="min-w-[4.5rem] rounded-md border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-center text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-500/15 dark:text-emerald-300"
        >
          Yes {yesPct}%
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpen(market);
          }}
          className="min-w-[4.5rem] rounded-md border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-center text-sm font-medium text-rose-700 transition-colors hover:bg-rose-500/15 dark:text-rose-300"
        >
          No {noPct}%
        </button>
        <ChevronRight className="ml-1 hidden size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 sm:block" aria-hidden />
      </div>
    </article>
  );
}

function FilterSelect({
  title,
  value,
  options,
  onChange,
}: {
  title: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{title}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-foreground/40"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function SidebarMarketList({
  title,
  items,
  onOpen,
}: {
  title: string;
  items: DiscoveryMarket[];
  onOpen: (market: DiscoveryMarket) => void;
}) {
  if (items.length === 0) return null;

  return (
    <section className="rounded-lg border border-border bg-card p-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <div className="mt-3 space-y-2">
        {items.map((market, index) => (
          <button
            key={market.id}
            type="button"
            onClick={() => onOpen(market)}
            className="flex w-full items-start gap-3 rounded-[18px] border border-transparent px-2 py-2 text-left transition-colors hover:border-border/60 hover:bg-background"
          >
            <span className="mt-0.5 text-[11px] font-medium text-muted-foreground">{index + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="line-clamp-2 text-[13px] font-semibold leading-5 text-foreground">{market.title}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">{market.assetSymbol} • {market.countdownLabel}</div>
            </div>
            <div className="shrink-0 text-[12px] font-semibold text-foreground">
              {formatCompactCurrency(market.yesPoolValue + market.noPoolValue)}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function DiscoverSidebar({
  featuredMarkets,
  highestVolumeMarkets,
  onOpenUpDown,
  onOpen,
}: {
  featuredMarkets: DiscoveryMarket[];
  highestVolumeMarkets: DiscoveryMarket[];
  onOpenUpDown: () => void;
  onOpen: (market: DiscoveryMarket) => void;
}) {
  return (
    <aside className="space-y-4 lg:sticky lg:top-28">
      <button
        type="button"
        onClick={onOpenUpDown}
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 text-left text-sm transition-colors hover:bg-muted/40"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-md border border-border bg-background">
            <TrendingUp className="size-4 text-foreground" />
          </div>
          <div>
            <div className="font-medium text-foreground">Up or Down</div>
            <div className="text-xs text-muted-foreground">Short intraday markets</div>
          </div>
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </button>

      <SidebarMarketList title="Featured" items={featuredMarkets.slice(0, 5)} onOpen={onOpen} />
      <SidebarMarketList title="Most volume" items={highestVolumeMarkets.slice(0, 5)} onOpen={onOpen} />
    </aside>
  );
}

const MarketsAll = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<DiscoveryTab>("All");
  const [assetFilter, setAssetFilter] = useState<AssetFilter>("All assets");
  const [scheduleFilter, setScheduleFilter] = useState<ScheduleFilter>("All schedules");
  const [narrativeFilter, setNarrativeFilter] = useState<NarrativeFilter>("All narratives");
  const [stateFilter, setStateFilter] = useState<StateFilter>("All states");
  const [sortFilter, setSortFilter] = useState<SortFilter>("Featured first");
  const [searchTerm, setSearchTerm] = useState("");
  const [openOnly, setOpenOnly] = useState(false);
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
    if (scheduleFilter !== "All schedules" && market.schedule !== scheduleFilter) return false;
    if (narrativeFilter !== "All narratives" && market.narrativeFamily !== narrativeFilter) return false;
    if (stateFilter !== "All states" && market.stateCategory !== stateFilter) return false;
    if (openOnly && market.stateCategory !== "Open") return false;

    const needle = searchTerm.trim().toLowerCase();
    if (needle) {
      const haystack = `${market.title} ${market.assetSymbol} ${market.narrativeFamily} ${market.thresholdLabel}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }

    return true;
  });

  filteredMarkets = [...filteredMarkets].sort((a, b) => {
    if (sortFilter === "Ending soon") {
      return new Date(a.endAt).getTime() - new Date(b.endAt).getTime();
    }
    if (sortFilter === "Closest to threshold") {
      return Math.abs(a.distancePct) - Math.abs(b.distancePct);
    }
    if (sortFilter === "Largest pool") {
      return b.yesPoolValue + b.noPoolValue - (a.yesPoolValue + a.noPoolValue);
    }
    if (a.isFeaturedDiscovery === b.isFeaturedDiscovery) {
      return new Date(a.endAt).getTime() - new Date(b.endAt).getTime();
    }
    return a.isFeaturedDiscovery ? -1 : 1;
  });

  const featuredStripMarkets = filteredMarkets.filter((market) => FEATURED_MARKET_IDS.includes(market.id)).slice(0, 5);
  const endingSoonMarkets = filteredMarkets
    .filter((market) => market.timeBucket === "Ending Soon")
    .sort((a, b) => new Date(a.endAt).getTime() - new Date(b.endAt).getTime())
    .slice(0, 5);
  const featuredThresholdMarkets = filteredMarkets.filter((market) => market.isFeaturedDiscovery);
  const highestVolumeMarkets = [...filteredMarkets]
    .sort((a, b) => b.yesPoolValue + b.noPoolValue - (a.yesPoolValue + a.noPoolValue))
    .slice(0, 5);
  const totalLiquidity = filteredMarkets.reduce((sum, market) => sum + market.yesPoolValue + market.noPoolValue, 0);
  const openCount = filteredMarkets.filter((market) => market.stateCategory === "Open").length;
  const endingSoonCount = filteredMarkets.filter((market) => market.timeBucket === "Ending Soon").length;

  const openMarket = (market: DiscoveryMarket) => {
    navigate(`/app/market/${market.id}`, { state: { market: market as Market } });
  };

  const openUpDownMarket = () => {
    navigate("/app/markets/updown");
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

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-8 lg:px-8">
        <header className="mb-6 border-b border-border pb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Markets</h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Browse live threshold markets—clean list, quick Yes / No. {filteredMarkets.length} active
            {openCount !== filteredMarkets.length ? ` · ${openCount} open` : ""}
            {endingSoonCount ? ` · ${endingSoonCount} ending soon` : ""} · {formatCompactCurrency(totalLiquidity)} in pools.
          </p>

          <div className="mt-4 flex h-10 w-full max-w-md items-center gap-2 rounded-md border border-border bg-card px-3">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search markets..."
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>

          <details className="mt-4 group">
            <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
              Filters & sort
            </summary>
            <div className="mt-4 grid gap-4 border-t border-border pt-4 md:grid-cols-2 lg:grid-cols-3">
              <FilterSelect title="Asset" value={assetFilter} options={ASSET_FILTERS} onChange={(value) => setAssetFilter(value as AssetFilter)} />
              <FilterSelect title="Schedule" value={scheduleFilter} options={SCHEDULE_FILTERS} onChange={(value) => setScheduleFilter(value as ScheduleFilter)} />
              <FilterSelect title="Narrative" value={narrativeFilter} options={NARRATIVE_FILTERS} onChange={(value) => setNarrativeFilter(value as NarrativeFilter)} />
              <FilterSelect title="State" value={stateFilter} options={STATE_FILTERS} onChange={(value) => setStateFilter(value as StateFilter)} />
              <div className="md:col-span-2 lg:col-span-2">
                <span className="mb-2 block text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Sort</span>
                <div className="flex flex-wrap gap-2">
                  {SORT_FILTERS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setSortFilter(option)}
                      className={cn(
                        "rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
                        sortFilter === option
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-background text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                <label className="mt-3 inline-flex items-center gap-2 text-xs text-foreground">
                  <input
                    type="checkbox"
                    checked={openOnly}
                    onChange={(event) => setOpenOnly(event.target.checked)}
                    className="size-3.5 rounded border-border"
                  />
                  Open only
                </label>
              </div>
            </div>
          </details>
        </header>

        <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
          <section className="min-w-0 flex-1">
            {featuredStripMarkets.length > 0 ? (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {featuredStripMarkets.map((market) => (
                  <button
                    key={market.id}
                    type="button"
                    onClick={() => openMarket(market)}
                    className="rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted/70"
                  >
                    {market.assetSymbol}: {market.heroTag}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="rounded-lg border border-border bg-card">
              {filteredMarkets.map((market) => (
                <MarketListRow key={market.id} market={market} onOpen={openMarket} />
              ))}
            </div>
          </section>

          <div className="shrink-0 lg:w-72">
            <DiscoverSidebar
              featuredMarkets={featuredThresholdMarkets.length > 0 ? featuredThresholdMarkets : featuredStripMarkets}
              highestVolumeMarkets={highestVolumeMarkets.length > 0 ? highestVolumeMarkets : endingSoonMarkets}
              onOpenUpDown={openUpDownMarket}
              onOpen={openMarket}
            />
          </div>
        </div>

        {filteredMarkets.length === 0 && (
          <section className="mt-8 rounded-lg border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
            <h2 className="text-lg font-semibold text-foreground">No markets match</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Try clearing search, setting asset to &quot;All assets&quot;, or opening Filters & sort to reset options.
            </p>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default MarketsAll;
