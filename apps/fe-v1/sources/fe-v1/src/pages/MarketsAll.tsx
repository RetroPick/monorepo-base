import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import MarketCard from "@/components/MarketCard";
import DiscoverFeaturedHero from "@/components/discover/DiscoverFeaturedHero";
import DiscoverLeftNav from "@/components/discover/DiscoverLeftNav";
import DiscoverRightRail from "@/components/discover/DiscoverRightRail";
import { cn } from "@/lib/utils";
import type { Market } from "@/types/market";
import type { DiscoveryMarket } from "@/types/discovery-market";
import type { DiscoveryVerticalId, MarketDiscoveryVerticalId } from "@/lib/discovery-verticals";
import { DISCOVERY_VERTICALS } from "@/lib/discovery-verticals";
import {
  countByAsset,
  countByHorizon,
  HORIZON_META,
  marketMatchesHorizon,
  type CryptoAssetFilterId,
  type CryptoHorizonId,
} from "@/lib/discover-crypto";

const UPDOWN_CRYPTO_HREF = "/app/markets/updown/crypto";

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

  type DiscoveryPreMap = Omit<DiscoveryMarket, "countdownLabel" | "discoveryVertical"> & { endAtDate: Date };

  function makeRangeDiscoveryEntry(spec: {
    id: string;
    title: string;
    assetSymbol: "BTC" | "ETH" | "SOL";
    assetName: string;
    icon: string;
    iconColor: string;
    schedule: "Daily" | "Weekly";
    narrativeFamily: DiscoveryMarket["narrativeFamily"];
    timeBucket: DiscoveryMarket["timeBucket"];
    hoursFromBase: number;
    bins: [string, number][];
    roundId: string;
  }): DiscoveryPreMap {
    const outcomes = spec.bins.map(([label, probability], i) => ({
      id: `${spec.id}-b${i}`,
      label,
      probability,
    }));
    const pool = Math.max(40000, spec.bins.reduce((s, [, p]) => s + p * 900, 0));
    return {
      id: spec.id,
      title: spec.title,
      description:
        "Range contract: one oracle close lands in exactly one non-overlapping bin — pick the bracket you believe in.",
      category: "Range",
      primitive: "Range",
      marketType: spec.schedule === "Weekly" ? "Weekly range" : "Daily range",
      icon: spec.icon,
      iconColor: spec.iconColor,
      outcomes,
      volume: "$380K",
      totalPool: "$128,000",
      expiry: spec.schedule === "Weekly" ? "Sunday close" : "Today close",
      isBinary: false,
      oracleSource:
        spec.assetSymbol === "BTC"
          ? "Chainlink BTC/USD"
          : spec.assetSymbol === "ETH"
            ? "Chainlink ETH/USD"
            : "Chainlink SOL/USD",
      timeframe: spec.schedule === "Weekly" ? "1 WEEK" : "1 DAY",
      status: "Open",
      roundId: spec.roundId,
      lockRule: "Range bins are fixed before entry closes; only one bin wins.",
      closeRule: "Final oracle close determines which bin is selected.",
      resolutionFormula: "The winning bin is where lower_bound <= close_price < upper_bin (last bin inclusive top).",
      invalidationRule: "Refund if close cannot be persisted from the oracle feed.",
      settlementLabel: "Machine-settled on Solana",
      assetSymbol: spec.assetSymbol,
      assetName: spec.assetName,
      timeBucket: spec.timeBucket,
      schedule: spec.schedule,
      narrativeFamily: spec.narrativeFamily,
      stateCategory: "Open",
      thresholdLabel: "Range bins",
      thresholdValue: 0,
      currentPrice: spec.assetSymbol === "BTC" ? 97200 : spec.assetSymbol === "ETH" ? 3400 : 185,
      distancePct: 0.45,
      endAtDate: buildDate(base, spec.hoursFromBase),
      endAt: "",
      yesPoolValue: Math.round(pool * 0.52),
      noPoolValue: Math.round(pool * 0.48),
      isFeaturedDiscovery: false,
      featuredNote: "Multi-bin range — each row is its own Yes/No, not a single compact binary strip.",
      ruleText: "Whichever bin contains the final oracle close wins.",
      heroTag: "Range",
    };
  }

  /** Stacked binary lines with range-like strip layout — not a single-winner bracket pool (see `MarketCard` multi layout). */
  function makeMultiDiscoveryEntry(spec: {
    id: string;
    title: string;
    assetSymbol: "BTC" | "ETH" | "SOL";
    assetName: string;
    icon: string;
    iconColor: string;
    schedule: "Daily" | "Weekly";
    narrativeFamily: DiscoveryMarket["narrativeFamily"];
    timeBucket: DiscoveryMarket["timeBucket"];
    hoursFromBase: number;
    lines: [string, number][];
    roundId: string;
  }): DiscoveryPreMap {
    const outcomes = spec.lines.map(([label, probability], i) => ({
      id: `${spec.id}-m${i}`,
      label,
      probability,
    }));
    const pool = Math.max(38000, spec.lines.reduce((s, [, p]) => s + p * 850, 0));
    return {
      id: spec.id,
      title: spec.title,
      description:
        "Multi Yes/No: each row is its own binary on that outcome (not one mutually exclusive bracket pool). Same strip layout as range for scanning.",
      category: "Crypto",
      primitive: "MultiYesNo",
      marketType: spec.schedule === "Weekly" ? "Weekly multi Yes/No" : "Daily multi Yes/No",
      icon: spec.icon,
      iconColor: spec.iconColor,
      outcomes,
      volume: "$265K",
      totalPool: "$102,000",
      expiry: spec.schedule === "Weekly" ? "Sunday close" : "Today close",
      isBinary: false,
      oracleSource:
        spec.assetSymbol === "BTC"
          ? "Chainlink BTC/USD"
          : spec.assetSymbol === "ETH"
            ? "Chainlink ETH/USD"
            : "Chainlink SOL/USD",
      timeframe: spec.schedule === "Weekly" ? "1 WEEK" : "1 DAY",
      status: "Open",
      roundId: spec.roundId,
      lockRule: "Each listed line settles as its own Yes/No when the window closes.",
      closeRule: "Daily or weekly close snapshot applies per line as defined in contract terms.",
      resolutionFormula: "For each row: YES if that row's condition is met at settlement; otherwise NO.",
      invalidationRule: "Refund if the oracle snapshot for a line cannot be persisted.",
      settlementLabel: "Machine-settled on Solana",
      assetSymbol: spec.assetSymbol,
      assetName: spec.assetName,
      timeBucket: spec.timeBucket,
      schedule: spec.schedule,
      narrativeFamily: spec.narrativeFamily,
      stateCategory: "Open",
      thresholdLabel: "Multi lines",
      thresholdValue: 0,
      currentPrice: spec.assetSymbol === "BTC" ? 97200 : spec.assetSymbol === "ETH" ? 3400 : 185,
      distancePct: 0.45,
      endAtDate: buildDate(base, spec.hoursFromBase),
      endAt: "",
      yesPoolValue: Math.round(pool * 0.51),
      noPoolValue: Math.round(pool * 0.49),
      isFeaturedDiscovery: false,
      featuredNote: "Stacked Yes/No lines with range-style labels — each line is independent.",
      ruleText: "Each row resolves YES or NO on its own condition; not a single bracket winner.",
      heroTag: "Multi",
    };
  }

  const binsBtc: [string, number][] = [
    ["< $102k", 14],
    ["$102k – $106k", 38],
    ["$106k – $110k", 32],
    ["> $110k", 16],
  ];
  const binsEth: [string, number][] = [
    ["< $3.2k", 12],
    ["$3.2k – $3.6k", 44],
    ["$3.6k – $4.0k", 28],
    ["> $4.0k", 16],
  ];
  const binsSol: [string, number][] = [
    ["< $170", 18],
    ["$170 – $195", 36],
    ["$195 – $220", 30],
    ["> $220", 16],
  ];

  const discoveryRangeRaw: DiscoveryPreMap[] = [];
  let rangeIx = 0;
  const rangeAssets = [
    { sym: "BTC" as const, name: "Bitcoin", icon: "candlestick_chart", color: "text-emerald-400", bins: binsBtc },
    { sym: "ETH" as const, name: "Ethereum", icon: "candlestick_chart", color: "text-sky-400", bins: binsEth },
    { sym: "SOL" as const, name: "Solana", icon: "candlestick_chart", color: "text-violet-400", bins: binsSol },
  ];
  for (const a of rangeAssets) {
    for (const sched of ["Daily", "Weekly"] as const) {
      for (let slot = 1; slot <= 4; slot++) {
        const sch = sched === "Daily" ? "d" : "w";
        const id = `${a.sym.toLowerCase()}-${sch}-range-v${slot}`;
        const title =
          sched === "Daily"
            ? `Where will ${a.sym}/USD close today? (v${slot})`
            : `Where will ${a.sym}/USD finish this week? (v${slot})`;
        discoveryRangeRaw.push(
          makeRangeDiscoveryEntry({
            id,
            title,
            assetSymbol: a.sym,
            assetName: a.name,
            icon: a.icon,
            iconColor: a.color,
            schedule: sched,
            narrativeFamily: "Above Daily Open",
            timeBucket: sched === "Daily" ? "Today" : "This Week",
            hoursFromBase: sched === "Daily" ? 5 + slot : 40 + slot * 8,
            bins: a.bins,
            roundId: `RNG-${a.sym}-${rangeIx++}`,
          }),
        );
      }
    }
  }

  const discoveryMultiRaw: DiscoveryPreMap[] = [];
  let multiIx = 0;
  const multiAssets = [
    { sym: "BTC" as const, name: "Bitcoin", icon: "layers", color: "text-emerald-400", lines: binsBtc },
    { sym: "ETH" as const, name: "Ethereum", icon: "layers", color: "text-sky-400", lines: binsEth },
    { sym: "SOL" as const, name: "Solana", icon: "layers", color: "text-violet-400", lines: binsSol },
  ];
  for (const a of multiAssets) {
    for (const sched of ["Daily", "Weekly"] as const) {
      for (let slot = 1; slot <= 3; slot++) {
        const sch = sched === "Daily" ? "d" : "w";
        const id = `${a.sym.toLowerCase()}-${sch}-multi-v${slot}`;
        const title =
          sched === "Daily"
            ? `${a.sym}/USD close zones — independent Yes/No (today v${slot})`
            : `${a.sym}/USD weekly close zones — independent Yes/No (v${slot})`;
        const lines: [string, number][] = a.lines.map(([label, p], i) => {
          const jitter = ((slot + i) % 5) - 2;
          return [label, Math.min(82, Math.max(10, p + jitter))] as [string, number];
        });
        discoveryMultiRaw.push(
          makeMultiDiscoveryEntry({
            id,
            title,
            assetSymbol: a.sym,
            assetName: a.name,
            icon: a.icon,
            iconColor: a.color,
            schedule: sched,
            narrativeFamily: "Above Daily Open",
            timeBucket: sched === "Daily" ? "Today" : "This Week",
            hoursFromBase: sched === "Daily" ? 4 + slot : 38 + slot * 7,
            lines,
            roundId: `MULTI-${a.sym}-${multiIx++}`,
          }),
        );
      }
    }
  }

  const discoveryThresholdRaw: DiscoveryPreMap[] = [
    {
      id: "btc-5m-updown",
      title: "BTC 5 Minute Up or Down",
      description: "Short-horizon directional contract: next 5-minute candle close vs open.",
      category: "Crypto",
      primitive: "Directional",
      marketType: "5 minute",
      icon: "currency_bitcoin",
      iconBg: "bg-orange-500",
      iconColor: "text-white",
      outcomes: [
        { id: "up", label: "Up", probability: 51 },
        { id: "down", label: "Down", probability: 49 },
      ],
      volume: "$2.1M",
      totalPool: "$890K",
      expiry: "5m",
      isBinary: true,
      binaryPresentation: "updown",
      oracleSource: "Exchange index",
      timeframe: "5 MIN",
      status: "Open",
      roundId: "BTC-5M-UD",
      lockRule: "Window locks at candle open.",
      closeRule: "Resolves on 5m candle close vs open.",
      resolutionFormula: "Up wins if close >= open for the window.",
      invalidationRule: "Refund if feed unavailable.",
      settlementLabel: "Machine-settled on Solana",
      assetSymbol: "BTC",
      assetName: "Bitcoin",
      timeBucket: "Today",
      schedule: "Daily",
      narrativeFamily: "Above Daily Open",
      stateCategory: "Open",
      thresholdLabel: "5m open",
      thresholdValue: 0,
      currentPrice: 97200,
      distancePct: 0,
      endAtDate: buildDate(base, 0.1),
      endAt: "",
      yesPoolValue: 452000,
      noPoolValue: 438000,
      isFeaturedDiscovery: true,
      featuredNote: "High-turnover short window — Polymarket-style directional card.",
      ruleText: "Up wins if the 5m candle closes at or above its open.",
      heroTag: "5m",
    },
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

  const raw = [...discoveryThresholdRaw, ...discoveryRangeRaw, ...discoveryMultiRaw];

  return raw.map((market) => ({
    ...market,
    discoveryVertical: "crypto" satisfies MarketDiscoveryVerticalId,
    endAt: market.endAtDate.toISOString(),
    countdownLabel: formatCountdown(market.endAtDate.toISOString(), nowMs),
  }));
}

type MarketsAllProps = { initialVertical?: DiscoveryVerticalId };

const MarketsAll = ({ initialVertical = "crypto" }: MarketsAllProps = {}) => {
  const navigate = useNavigate();
  const [activeVertical, setActiveVertical] = useState<DiscoveryVerticalId>(initialVertical);
  const [nowMs, setNowMs] = useState(Date.now());
  const [cryptoAssetFilter, setCryptoAssetFilter] = useState<CryptoAssetFilterId>("all");
  const [cryptoHorizon, setCryptoHorizon] = useState<CryptoHorizonId>("all");

  useEffect(() => {
    const intervalId = window.setInterval(() => setNowMs(Date.now()), 60000);
    return () => window.clearInterval(intervalId);
  }, []);

  const discoveryMarkets = getDiscoveryMarkets(nowMs);

  const baseCryptoMarkets = useMemo(
    () => discoveryMarkets.filter((m) => m.discoveryVertical === "crypto"),
    [discoveryMarkets],
  );

  const trendingRailMarkets = useMemo(() => {
    return [...baseCryptoMarkets].sort(
      (a, b) => b.yesPoolValue + b.noPoolValue - (a.yesPoolValue + a.noPoolValue),
    );
  }, [baseCryptoMarkets]);

  const horizonOptions = useMemo(() => {
    if (activeVertical !== "crypto") return [];
    const hCounts = countByHorizon(baseCryptoMarkets);
    const opts: { id: CryptoHorizonId; label: string; count: number }[] = [
      { id: "all", label: "All", count: baseCryptoMarkets.length },
    ];
    for (const { id, label } of HORIZON_META) {
      const c = hCounts[id];
      if (c > 0) opts.push({ id, label, count: c });
    }
    return opts;
  }, [activeVertical, baseCryptoMarkets]);

  const assetOptions = useMemo(() => {
    if (activeVertical !== "crypto") return [];
    const a = countByAsset(baseCryptoMarkets);
    return [
      { id: "all" as const, label: "All", count: baseCryptoMarkets.length },
      { id: "BTC" as const, label: "BTC", count: a.BTC },
      { id: "ETH" as const, label: "ETH", count: a.ETH },
      { id: "SOL" as const, label: "SOL", count: a.SOL },
    ];
  }, [activeVertical, baseCryptoMarkets]);

  let filteredMarkets: DiscoveryMarket[] =
    activeVertical === "trending"
      ? [...baseCryptoMarkets]
      : discoveryMarkets.filter((market) => market.discoveryVertical === activeVertical);

  if (activeVertical === "crypto") {
    if (cryptoAssetFilter !== "all") {
      filteredMarkets = filteredMarkets.filter((m) => m.assetSymbol === cryptoAssetFilter);
    }
    if (cryptoHorizon !== "all") {
      filteredMarkets = filteredMarkets.filter((m) => marketMatchesHorizon(m, cryptoHorizon));
    }
  }

  if (activeVertical === "trending") {
    filteredMarkets = [...filteredMarkets].sort(
      (a, b) => b.yesPoolValue + b.noPoolValue - (a.yesPoolValue + a.noPoolValue),
    );
  } else {
    filteredMarkets = [...filteredMarkets].sort((a, b) => {
      if (a.isFeaturedDiscovery === b.isFeaturedDiscovery) {
        return new Date(a.endAt).getTime() - new Date(b.endAt).getTime();
      }
      return a.isFeaturedDiscovery ? -1 : 1;
    });
  }

  const heroMarket =
    activeVertical === "trending" && filteredMarkets.length > 0 ? filteredMarkets[0] : null;
  const gridMarkets =
    activeVertical === "trending" && heroMarket && filteredMarkets.length > 1
      ? filteredMarkets.filter((m) => m.id !== heroMarket.id)
      : filteredMarkets;

  const openMarket = (market: DiscoveryMarket) => {
    navigate(`/app/market/${market.id}`, { state: { market: market as Market } });
  };

  const openUpDownMarket = () => {
    navigate(UPDOWN_CRYPTO_HREF);
  };

  const showEmpty =
    gridMarkets.length === 0 && !(activeVertical === "trending" && heroMarket);

  const gridClass =
    "grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-2 lg:gap-6 xl:grid-cols-3 xl:gap-5";

  const marketCardProps = (market: DiscoveryMarket) => ({
    market,
    variant: "discover" as const,
    navigationState: { market: market as Market },
  });

  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      <Header
        discoveryNav={{
          verticals: DISCOVERY_VERTICALS,
          activeVerticalId: activeVertical,
          onVerticalChange: setActiveVertical,
        }}
      />

      <main className="mx-auto max-w-[1440px] px-5 pb-20 pt-10 lg:px-10 lg:pt-12">
        {activeVertical === "trending" ? (
          <div
            className="flex flex-col gap-8 xl:grid xl:grid-cols-[1fr_minmax(260px,320px)] xl:items-start xl:gap-10"
            data-testid="discover-layout-trending"
          >
            <div className="min-w-0">
              {heroMarket ? (
                <DiscoverFeaturedHero
                  market={heroMarket}
                  eyebrow={heroMarket.heroTag || heroMarket.category}
                  countdownLabel={heroMarket.countdownLabel}
                  onOpen={() => openMarket(heroMarket)}
                />
              ) : null}
              <h2 className="mt-8 text-lg font-semibold tracking-tight text-foreground">All markets</h2>
              <div className={cn("mt-4", gridClass)}>
                {gridMarkets.map((market) => (
                  <div key={market.id} className="h-full min-h-0">
                    <MarketCard {...marketCardProps(market)} />
                  </div>
                ))}
              </div>
            </div>
            <div className="min-w-0 shrink-0">
              <DiscoverRightRail
                trendingMarkets={trendingRailMarkets.slice(0, 7)}
                onOpenUpDown={openUpDownMarket}
                onOpen={openMarket}
              />
            </div>
          </div>
        ) : activeVertical === "crypto" ? (
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10" data-testid="discover-layout-crypto">
            <DiscoverLeftNav
              assetOptions={assetOptions}
              horizonOptions={horizonOptions}
              activeAsset={cryptoAssetFilter}
              activeHorizon={cryptoHorizon}
              onAssetChange={setCryptoAssetFilter}
              onHorizonChange={setCryptoHorizon}
            />
            <div className="min-w-0 flex-1">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">Crypto</h1>
                <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label="Crypto product links">
                  <span className="font-medium text-foreground">All</span>
                  <Link
                    to={UPDOWN_CRYPTO_HREF}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Up vs Down
                  </Link>
                  <Link
                    to="/app/markets/abovebelow/crypto"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Above or Below
                  </Link>
                </nav>
              </div>
              <div className={gridClass}>
                {gridMarkets.map((market) => (
                  <div key={market.id} className="h-full min-h-0">
                    <MarketCard {...marketCardProps(market)} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className={gridClass}>
            {gridMarkets.map((market) => (
              <div key={market.id} className="h-full min-h-0">
                <MarketCard {...marketCardProps(market)} />
              </div>
            ))}
          </div>
        )}

        {showEmpty ? (
          <section className="mt-8 rounded-lg border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
            <h2 className="text-lg font-semibold text-foreground">No markets match</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Try another category in the strip above — markets will appear here as they are listed.
            </p>
          </section>
        ) : null}
      </main>

      <Footer />
    </div>
  );
};

export default MarketsAll;
