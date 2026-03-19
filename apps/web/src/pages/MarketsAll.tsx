import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowDownRight,
  CalendarRange,
  ChevronRight,
  ShieldCheck,
  Timer,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { AssetLogo } from "@/components/AssetLogo";
import { useAssetDetail } from "@/hooks/useAssetDetail";
import { FALLBACK_ASSETS } from "@/lib/market-data/coingecko";
import { CandlePoint } from "@/lib/market-data/types";
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
type CampaignAssetSymbol = "BTC" | "ETH" | "SOL" | "BNB" | "XRP" | "DOGE" | "ADA" | "LINK";

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
    chip: string;
    progress: string;
  }
> = {
  Open: {
    badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    chip: "text-emerald-300",
    progress: "from-emerald-400 via-cyan-400 to-teal-300",
  },
  Locked: {
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    chip: "text-amber-300",
    progress: "from-amber-400 via-orange-400 to-amber-300",
  },
  Resolving: {
    badge: "border-sky-500/30 bg-sky-500/10 text-sky-300",
    chip: "text-sky-300",
    progress: "from-sky-400 via-blue-400 to-cyan-300",
  },
};

function buildDate(base: number, offsetHours: number) {
  return new Date(base + offsetHours * 60 * 60 * 1000);
}

function formatCurrency(value: number, digits = 0) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: digits,
  }).format(value);
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

function formatMiniPrice(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
}

function formatMiniMinuteLabel(unixSeconds: number) {
  return new Date(unixSeconds * 1000).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
}

function CampaignMiniChart({
  candles,
  livePrice,
}: {
  candles: CandlePoint[];
  livePrice?: number;
}) {
  const chartCandles = candles.slice(-10);

  if (chartCandles.length === 0) {
    return (
      <div className="flex h-[190px] items-center justify-center rounded-[26px] border border-border/60 bg-background/75 text-sm font-medium text-muted-foreground">
        Loading latest candles...
      </div>
    );
  }

  const values = chartCandles.flatMap((candle) => [candle.high, candle.low]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const rawRange = Math.max(max - min, 0);
  const referencePrice = chartCandles[chartCandles.length - 1]?.close ?? max;
  const observedPct = referencePrice > 0 ? rawRange / referencePrice : 0;
  const paddingPct = observedPct < 0.0008 ? 0.00008 : observedPct < 0.0025 ? 0.00014 : 0.00024;
  const padding = Math.max(rawRange * 0.14, referencePrice * paddingPct);
  const domainMin = min - padding;
  const domainMax = max + padding;
  const range = Math.max(domainMax - domainMin, referencePrice * 0.0002, 0.000001);
  const latestCandle = chartCandles[chartCandles.length - 1];
  const latestPrice = livePrice ?? latestCandle.close;
  const delta = latestPrice - chartCandles[0].open;
  const deltaPct = chartCandles[0].open ? (delta / chartCandles[0].open) * 100 : 0;

  return (
    <div className="rounded-[26px] border border-border/60 bg-background/75 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Last 10 candles</div>
          <div className="mt-1 text-[24px] font-black tracking-[-0.04em] text-foreground">{formatMiniPrice(latestPrice)}</div>
        </div>
        <div className={cn("rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em]", delta >= 0 ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-300" : "bg-rose-500/12 text-rose-600 dark:text-rose-300")}>
          {delta >= 0 ? "+" : ""}{deltaPct.toFixed(2)}%
        </div>
      </div>

      <div className="mt-4 flex h-[118px] items-end gap-1 overflow-hidden rounded-[20px] bg-[linear-gradient(to_top,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:100%_24px] px-2 pb-6 pt-2">
        {chartCandles.map((candle, index) => {
          const bodyTop = ((domainMax - Math.max(candle.open, candle.close)) / range) * 100;
          const bodyHeight = Math.max((Math.abs(candle.close - candle.open) / range) * 100, 10);
          const wickTop = ((domainMax - candle.high) / range) * 100;
          const wickHeight = Math.max(((candle.high - candle.low) / range) * 100, 16);
          const rising = candle.close >= candle.open;

          return (
            <div key={candle.time} className="relative h-full min-w-0 flex-1">
              <div
                className={cn("absolute left-1/2 w-[3px] -translate-x-1/2 rounded-full", rising ? "bg-emerald-500/80" : "bg-rose-500/80")}
                style={{ top: `${wickTop}%`, height: `${wickHeight}%` }}
              />
              <div
                className={cn("absolute left-1/2 min-h-[8px] w-[72%] -translate-x-1/2 rounded-[6px] border shadow-[0_12px_26px_-18px_rgba(15,23,42,0.6)]", rising ? "border-emerald-400/40 bg-gradient-to-b from-emerald-300 to-emerald-500" : "border-rose-400/40 bg-gradient-to-b from-rose-300 to-rose-500")}
                style={{ top: `${bodyTop}%`, height: `${bodyHeight}%` }}
              />
              {(index === 0 || index === chartCandles.length - 1) ? (
                <div className={cn("absolute bottom-0 translate-y-5 text-[9px] font-semibold text-muted-foreground", index === 0 ? "left-0" : "right-0")}>
                  {formatMiniMinuteLabel(candle.time)}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
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

function DiscoveryCard({
  market,
  onOpen,
}: {
  market: DiscoveryMarket;
  onOpen: (market: DiscoveryMarket) => void;
}) {
  const totalPool = market.yesPoolValue + market.noPoolValue;
  const yesShare = (market.yesPoolValue / totalPool) * 100;
  const noShare = 100 - yesShare;
  const style = discoveryStatusStyles[market.stateCategory];
  const ctaLabel =
    market.stateCategory === "Open" ? "Yes / No" : market.stateCategory === "Locked" ? "Track result" : "View details";

  return (
    <article
      onClick={() => onOpen(market)}
      className="group flex h-full flex-col justify-between rounded-[24px] border border-border/60 bg-card/88 p-3.5 text-left text-card-foreground shadow-[0_24px_60px_-45px_rgba(15,23,42,0.24)] backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:bg-card dark:shadow-[0_24px_60px_-45px_rgba(2,6,23,0.72)]"
    >
      <div>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <AssetLogo symbol={market.assetSymbol} className="size-9" />
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{market.assetSymbol}</span>
              <span className="h-1 w-1 rounded-full bg-border" />
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{market.narrativeFamily}</span>
            </div>
            <div className="mt-2 line-clamp-2 text-[15px] font-semibold leading-6 text-foreground">
              {market.title}
            </div>
          </div>

          <div className="flex gap-1.5">
            <span className="rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-[8px] font-bold uppercase text-muted-foreground">{market.schedule}</span>
            <span className={cn("rounded-full border px-2 py-0.5 text-[8px] font-bold uppercase", style.badge)}>{market.stateCategory}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-[18px] border border-border/50 bg-background/55 p-3">
          <MetricCell label={market.thresholdLabel}>
            {formatCurrency(market.thresholdValue, market.thresholdValue >= 1000 ? 0 : 2)}
          </MetricCell>
          <MetricCell label="Current Price">
            {formatCurrency(market.currentPrice, market.currentPrice >= 1000 ? 0 : 2)}
          </MetricCell>
          <MetricCell label="Ends In" className={market.timeBucket === "Ending Soon" ? "text-rose-400" : undefined}>
            {market.countdownLabel}
          </MetricCell>
          <MetricCell label="Total Pool">{formatCompactCurrency(totalPool)}</MetricCell>
        </div>

        <div className="mt-3">
          <div className="flex h-[4px] overflow-hidden rounded-full bg-border/70 dark:bg-white/10">
            <div
              style={{ width: `${yesShare}%` }}
              className={cn("h-full rounded-full bg-gradient-to-r", style.progress)}
            />
            <div
              className="h-full bg-gradient-to-r from-rose-500 via-red-500 to-red-600"
              style={{ width: `${100 - yesShare}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] font-semibold">
            <span className="text-emerald-500 dark:text-emerald-400">{Math.round(yesShare)}% YES</span>
            <span className="text-rose-500 dark:text-rose-400">{Math.round(noShare)}% NO</span>
          </div>
        </div>
      </div>

      <div className="mt-4 border-t border-border/50 pt-3">
        {market.stateCategory === "Open" ? (
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => onOpen(market)} className="rounded-2xl bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-300 py-1.5 text-[10px] font-black text-white transition hover:brightness-105">
              YES
            </button>
            <button onClick={() => onOpen(market)} className="rounded-2xl bg-gradient-to-r from-rose-500 via-red-500 to-red-600 py-1.5 text-[10px] font-black text-white transition hover:brightness-105">
              NO
            </button>
          </div>
        ) : (
          <button onClick={() => onOpen(market)} className="w-full rounded-2xl border border-border/70 bg-background/75 py-1.5 text-[10px] font-bold text-foreground transition hover:bg-background">
            {ctaLabel}
          </button>
        )}
      </div>
    </article>
  );
}

function MetricCell({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div>
      <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 text-[12px] font-bold text-foreground", className)}>{children}</div>
    </div>
  );
}

function MarketSection({
  title,
  subtitle,
  icon,
  markets,
  onOpen,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  markets: DiscoveryMarket[];
  onOpen: (market: DiscoveryMarket) => void;
}) {
  if (markets.length === 0) return null;

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
            <span className="text-primary">{icon}</span>
            {title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <button className="text-sm font-semibold text-primary hover:underline">View all</button>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {markets.map((market) => (
          <DiscoveryCard key={market.id} market={market} onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
}

function CompactMetric({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div>
      <div className="text-[11px] text-white/38">{label}</div>
      <div className={cn("mt-0.5 text-[12px] font-semibold text-white", className)}>{children}</div>
    </div>
  );
}

function SideList({
  title,
  items,
  variant,
}: {
  title: string;
  items: DiscoveryMarket[];
  variant: "new" | "volume";
}) {
  if (items.length === 0) return null;

  return (
    <section>
      <h3 className="text-[15px] font-semibold tracking-tight text-foreground">{title}</h3>
      <div className="mt-3 space-y-2">
        {items.map((market, index) => {
          const totalPool = market.yesPoolValue + market.noPoolValue;
          const yesLean = Math.round((market.yesPoolValue / totalPool) * 100);
          const metric = variant === "new" ? `${Math.max(...market.outcomes.map((o) => o.probability))}%` : formatCompactCurrency(totalPool);

          return (
            <button
              key={market.id}
              className="w-full rounded-[18px] border border-transparent px-3 py-2.5 text-left transition-all duration-200 hover:border-border/60 hover:bg-muted/45"
              type="button"
            >
              <div className="grid grid-cols-[14px_minmax(0,1fr)_auto] gap-3">
                <div className="pt-0.5 text-[12px] font-semibold text-muted-foreground">{index + 1}</div>
                <div className="min-w-0">
                  <div className="line-clamp-2 text-[13px] font-semibold leading-5 text-foreground">{market.title}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">{market.assetName}</div>
                  <div className="mt-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                    <span>{market.countdownLabel}</span>
                    <span>{market.schedule}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[13px] font-semibold text-foreground">{metric}</div>
                  <div className="mt-1 flex items-center justify-end gap-1 text-[10px] font-semibold text-emerald-500 dark:text-emerald-400">
                    <TrendingUp className="size-3.5" />
                    <span>{yesLean}</span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function FeaturedStrip({
  markets,
  onOpen,
}: {
  markets: DiscoveryMarket[];
  onOpen: (market: DiscoveryMarket) => void;
}) {
  if (markets.length === 0) return null;

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
            <span className="text-primary">
              <ShieldCheck className="size-5" />
            </span>
            Featured Thresholds
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            High-signal threshold stories placed first, before the deeper market shelves.
          </p>
        </div>
        <button className="text-sm font-semibold text-primary hover:underline">View all</button>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {markets.map((market) => (
          <DiscoveryCard key={market.id} market={market} onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
}

function DiscoverSidebar({
  trendingMarkets,
  highestVolumeMarkets,
  onOpenUpDown,
  campaignAsset,
}: {
  trendingMarkets: DiscoveryMarket[];
  highestVolumeMarkets: DiscoveryMarket[];
  onOpenUpDown: () => void;
  campaignAsset: CampaignAssetSymbol;
}) {
  const { data: campaignDetail } = useAssetDetail(campaignAsset, "1m");
  const recentCampaignCandles = useMemo(() => campaignDetail?.candles.slice(-10) ?? [], [campaignDetail?.candles]);

  return (
    <aside className="space-y-4 p-2 lg:pt-0">
      <button
        type="button"
        onClick={onOpenUpDown}
        className="group relative w-full overflow-hidden rounded-[30px] border border-sky-500/25 bg-card p-6 text-left text-card-foreground shadow-[0_28px_90px_-48px_rgba(59,130,246,0.34)] transition-all duration-200 hover:-translate-y-1 hover:border-sky-400/40"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.28),transparent_44%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.22),transparent_44%)]" />
        <div className="absolute inset-x-6 bottom-[-3rem] h-24 rounded-full bg-gradient-to-r from-sky-500/22 via-cyan-400/24 to-emerald-400/18 blur-2xl transition-transform duration-500 group-hover:scale-110" />
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="mt-2 pr-1 pb-1 bg-[linear-gradient(120deg,#ef4444_0%,#3b82f6_24%,#22c55e_48%,#2563eb_72%,#dc2626_100%)] bg-[length:240%_240%] bg-clip-text text-[30px] font-black italic leading-[1.02] tracking-[-0.05em] text-transparent [text-shadow:0_0_1px_rgba(255,255,255,0.14)] animate-[campaign-glow_2.4s_linear_infinite]">
                UP or DOWN?
              </h3>
            </div>
            <AssetLogo
              alt={campaignDetail?.asset.name ?? campaignAsset}
              imageSrc={campaignDetail?.asset.image}
              symbol={campaignAsset}
              className="size-14"
            />
          </div>
          <div className="mt-5">
            <CampaignMiniChart candles={recentCampaignCandles} livePrice={campaignDetail?.livePriceUsd} />
          </div>
          <div className="mt-5 inline-flex items-center rounded-full border border-sky-400/20 bg-sky-500/12 px-4 py-2 text-[12px] font-black uppercase tracking-[0.14em] text-sky-700 dark:text-sky-300">
            Pick Now!
          </div>
        </div>
      </button>

      <div className="group relative cursor-pointer overflow-hidden rounded-[28px] border border-emerald-500/20 bg-card p-5 text-center text-card-foreground shadow-[0_24px_80px_-50px_rgba(16,185,129,0.35)] transition-transform duration-200 hover:-translate-y-0.5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.22),transparent_58%)] dark:bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.16),transparent_58%)]" />
        <div className="relative z-10">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-emerald-400">BTC Price Prediction Challenge</p>
          <h3 className="mb-2 text-[28px] font-black italic leading-none tracking-tighter text-foreground">$10M POOL</h3>
          <div className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-muted-foreground">Ends in 1d 20h 5m</div>
        </div>
        <div className="absolute bottom-[-1.5rem] left-1/2 flex w-full -translate-x-1/2 justify-center opacity-10 transition-transform duration-500 group-hover:scale-110">
          <TrendingUp className="size-20 text-emerald-500" />
        </div>
      </div>

      <div className="cursor-pointer rounded-[24px] border border-border/60 bg-card/82 px-4 py-4 shadow-[0_18px_48px_-42px_rgba(15,23,42,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Featured Narrative</p>
            <h4 className="mt-1 text-[15px] font-semibold text-foreground">ETH Spot ETF</h4>
            <p className="mt-1 text-[11px] text-muted-foreground">Approval Deadline May 2024</p>
          </div>
          <div className="flex h-8 w-10 items-center justify-center rounded-2xl border border-border/60 bg-background/75 text-lg">📈</div>
        </div>
      </div>

      <section>
        <h3 className="text-[15px] font-semibold tracking-tight text-foreground">Trending</h3>
        <div className="mt-3 space-y-2">
          {trendingMarkets.slice(0, 2).map((market, index) => (
            <button
              key={market.id}
              type="button"
              className="flex w-full items-start gap-3 rounded-[18px] border border-transparent px-3 py-2.5 text-left transition-all duration-200 hover:border-border/60 hover:bg-muted/45"
            >
              <span className="pt-0.5 text-[12px] font-semibold text-muted-foreground">{index + 1}</span>
              <div className="min-w-0 flex-1">
                <h5 className="line-clamp-2 text-[13px] font-semibold leading-5 text-foreground">{market.title}</h5>
                <p className="mt-1 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">{market.narrativeFamily}</p>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-[13px] font-semibold text-foreground">{Math.max(...market.outcomes.map((outcome) => outcome.probability))}%</div>
                <div className="mt-1 flex items-center justify-end text-[10px] font-semibold text-rose-500 dark:text-rose-400">
                  <TrendingDown className="size-3" /> 4
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <SideList title="Highest volume" items={highestVolumeMarkets} variant="volume" />
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
  const [campaignAssetIndex, setCampaignAssetIndex] = useState(0);
  const campaignAssets: CampaignAssetSymbol[] = ["BTC", "ETH", "SOL", "BNB", "XRP", "DOGE", "ADA", "LINK"];

  useEffect(() => {
    const intervalId = window.setInterval(() => setNowMs(Date.now()), 60000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCampaignAssetIndex((current) => (current + 1) % campaignAssets.length);
    }, 4200);

    return () => window.clearInterval(intervalId);
  }, [campaignAssets.length]);

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

  const featuredStripMarkets = filteredMarkets.filter((market) => FEATURED_MARKET_IDS.includes(market.id)).slice(0, 6);
  const todayMarkets = filteredMarkets.filter((market) => market.timeBucket === "Today").slice(0, 6);
  const weekMarkets = filteredMarkets.filter((market) => market.timeBucket === "This Week").slice(0, 6);
  const endingSoonMarkets = filteredMarkets
    .filter((market) => market.timeBucket === "Ending Soon")
    .sort((a, b) => new Date(a.endAt).getTime() - new Date(b.endAt).getTime())
    .slice(0, 6);
  const aboveYesterdayCloseMarkets = filteredMarkets.filter((market) => market.narrativeFamily === "Above Yesterday Close").slice(0, 6);
  const belowWeeklyOpenMarkets = filteredMarkets.filter((market) => market.narrativeFamily === "Below Weekly Open").slice(0, 6);
  const featuredThresholdMarkets = filteredMarkets.filter((market) => market.isFeaturedDiscovery);
  const highestVolumeMarkets = [...filteredMarkets]
    .sort((a, b) => b.yesPoolValue + b.noPoolValue - (a.yesPoolValue + a.noPoolValue))
    .slice(0, 3);

  const openMarket = (market: DiscoveryMarket) => {
    navigate(`/app/market/${market.id}`, { state: { market: market as Market } });
  };

  const openUpDownMarket = () => {
    navigate("/app/markets/updown");
  };
  const fallbackCampaignAssets = new Set(FALLBACK_ASSETS.map((asset) => asset.symbol));
  const campaignAsset = fallbackCampaignAssets.has(campaignAssets[campaignAssetIndex]) ? campaignAssets[campaignAssetIndex] : "BTC";

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.08),transparent_42%)] dark:bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.14),transparent_46%)]" />
        <div className="absolute left-[8%] top-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-[110px] dark:bg-cyan-400/12" />
        <div className="absolute right-[6%] top-48 h-80 w-80 rounded-full bg-emerald-400/10 blur-[120px] dark:bg-emerald-400/10" />
        <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-background via-background/80 to-transparent" />
      </div>
      <Header
        discoveryNav={{
          tabs: TABS,
          activeTab,
          onTabChange: (tab) => setActiveTab(tab as DiscoveryTab),
          assetFilter,
          onAssetFilterChange: (value) => setAssetFilter(value as AssetFilter),
        }}
      />

      <main className="mx-auto max-w-[1440px] px-4 pb-16 pt-40 lg:px-8">
        <div className="mt-8 flex flex-col gap-8 lg:flex-row">
          <div className="space-y-10 lg:w-3/4">
            <FeaturedStrip markets={featuredStripMarkets} onOpen={openMarket} />

            <MarketSection
              title="Today's Key Levels"
              subtitle="Strongest daily threshold markets and the main habit-loop entry point."
              icon={<TrendingUp className="size-5" />}
              markets={todayMarkets}
              onOpen={openMarket}
            />
            <MarketSection
              title="This Week"
              subtitle="Longer-horizon anchor markets with stronger narrative concentration."
              icon={<CalendarRange className="size-5" />}
              markets={weekMarkets}
              onOpen={openMarket}
            />
            <MarketSection
              title="Ending Soon"
              subtitle="Urgency-first shelf sorted by the nearest lock or resolution."
              icon={<Timer className="size-5" />}
              markets={endingSoonMarkets}
              onOpen={openMarket}
            />
            <MarketSection
              title="Above Yesterday Close"
              subtitle="Recurring family shelf for the simplest reclaim narrative."
              icon={<TrendingUp className="size-5" />}
              markets={aboveYesterdayCloseMarkets}
              onOpen={openMarket}
            />
            <MarketSection
              title="Below Weekly Open"
              subtitle="Inverse weekly framing for users scanning bearish threshold setups."
              icon={<ArrowDownRight className="size-5" />}
              markets={belowWeeklyOpenMarkets}
              onOpen={openMarket}
            />
          </div>

          <div className="lg:w-1/4">
            <DiscoverSidebar
              trendingMarkets={featuredThresholdMarkets}
              highestVolumeMarkets={highestVolumeMarkets}
              onOpenUpDown={openUpDownMarket}
              campaignAsset={campaignAsset}
            />
          </div>
        </div>

        {filteredMarkets.length === 0 && (
          <section className="mt-10 rounded-[28px] border border-dashed border-border/70 bg-card/75 p-10 text-center shadow-[0_24px_64px_-44px_rgba(15,23,42,0.18)] backdrop-blur dark:shadow-[0_28px_80px_-44px_rgba(2,6,23,0.82)]">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">No markets match this discovery state.</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Loosen a filter or switch tabs. The page is intentionally curated, so combinations can narrow to zero quickly.
            </p>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default MarketsAll;
