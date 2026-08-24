"use client";

import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Crown,
  Search,
  TrendingUp,
  Sparkles,
  Zap,
  ShieldCheck,
  Filter,
  ArrowUpRight,
  UserPlus,
  Check,
  Activity,
  Flame,
  Globe,
  Radio,
  BarChart3,
  Layers,
  Award,
  Clock,
  ArrowRight,
  TrendingDown,
  Percent,
} from "lucide-react";

import { cn } from "@/shared/lib/utils";
import { MarketsAppShell } from "../components/shell/MarketsAppShell";
import {
  FIXTURE_SMART_MONEY,
  FIXTURE_WHALE_FEED,
  FIXTURE_INTELLIGENCE_SIGNALS,
  WhaleFeedItem,
} from "../intelligence/fixtures/devFixtures";
import {
  intelligenceFollowingPath,
  intelligencePaperPath,
  intelligenceSmartMoneyPath,
  walletProfilePath,
  marketPath,
} from "../routes/paths";

const RANK_MEDALS: Record<number, { label: string; bg: string; border: string; text: string }> = {
  1: { label: "🥇 #1", bg: "bg-amber-500/20", border: "border-amber-500/40", text: "text-amber-300" },
  2: { label: "🥈 #2", bg: "bg-slate-300/20", border: "border-slate-300/40", text: "text-slate-200" },
  3: { label: "🥉 #3", bg: "bg-orange-500/20", border: "border-orange-500/40", text: "text-orange-300" },
};

function shortWallet(wallet: string): string {
  return wallet.length > 12 ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : wallet;
}

export function IntelligenceHubPage() {
  const [activeView, setActiveView] = useState<"all" | "whales" | "smart_money" | "ai_signals">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sizeFilter, setSizeFilter] = useState<"all" | "50k" | "100k">("all");
  const [sideFilter, setSideFilter] = useState<"all" | "YES" | "NO">("all");
  const [following, setFollowing] = useState<Record<string, boolean>>({});

  const toggleFollow = (wallet: string) => {
    setFollowing((prev) => ({ ...prev, [wallet]: !prev[wallet] }));
  };

  const filteredWhales = useMemo(() => {
    let list: WhaleFeedItem[] = FIXTURE_WHALE_FEED;

    if (selectedCategory !== "all") {
      list = list.filter((w) => w.category === selectedCategory);
    }

    if (sizeFilter === "50k") {
      list = list.filter((w) => w.sizeUsd >= 50000);
    } else if (sizeFilter === "100k") {
      list = list.filter((w) => w.sizeUsd >= 100000);
    }

    if (sideFilter !== "all") {
      list = list.filter((w) => w.side === sideFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (w) =>
          w.wallet.toLowerCase().includes(q) ||
          (w.ens && w.ens.toLowerCase().includes(q)) ||
          w.market.toLowerCase().includes(q),
      );
    }
    return list;
  }, [selectedCategory, sizeFilter, sideFilter, searchQuery]);

  const filteredSmartMoney = useMemo(() => {
    if (!searchQuery.trim()) return FIXTURE_SMART_MONEY;
    const q = searchQuery.trim().toLowerCase();
    return FIXTURE_SMART_MONEY.filter(
      (m) =>
        m.wallet.toLowerCase().includes(q) ||
        (m.ens && m.ens.toLowerCase().includes(q)) ||
        m.specialty.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  const totalWhaleVolume = useMemo(() => {
    const sum = FIXTURE_WHALE_FEED.reduce((acc, w) => acc + w.sizeUsd, 0);
    return (sum / 1_000_000).toFixed(2);
  }, []);

  return (
    <MarketsAppShell title="Intelligence Hub - RetroPick">
      {/* 1. Ultra-Premium Header Hero Banner */}
      <div className="relative mb-8 overflow-hidden rounded-3xl border border-blue-500/30 bg-gradient-to-r from-[#090D18] via-[#0F172A] to-[#0A0E1A] p-6 sm:p-8 shadow-2xl shadow-blue-950/30">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-xl shadow-blue-500/30 border border-blue-400/30">
              <Sparkles className="h-7 w-7 animate-pulse" />
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-white">
                  RetroPick Intelligence Hub
                </h1>
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/30 font-mono">
                  <Radio className="h-3 w-3 animate-pulse" />
                  Live Radar · 20+ Whales
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-300 max-w-2xl leading-relaxed">
                Institutional prediction intelligence: monitor large whale fills in real-time, track top-ranked Smart Money wallets, and trade smart money divergence signals.
              </p>
            </div>
          </div>

          {/* Quick Sub-Navigation Pills */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <Link
              to={intelligenceSmartMoneyPath()}
              className="flex items-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/15 px-4 py-2.5 text-xs font-bold text-amber-300 hover:bg-amber-500/25 transition-all shadow-lg shadow-amber-500/10"
            >
              <Crown className="h-4 w-4 text-amber-400" />
              <span>Smart Money ({FIXTURE_SMART_MONEY.length})</span>
            </Link>
            <Link
              to={intelligenceFollowingPath()}
              className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-white/15 hover:text-white transition-all shadow-sm"
            >
              Following
            </Link>
            <Link
              to={intelligencePaperPath()}
              className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-white/15 hover:text-white transition-all shadow-sm"
            >
              Paper Trade
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Key Intelligence Metrics KPI Cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Metric 1 */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0E1424] p-5 shadow-xl hover:border-blue-500/30 transition-all">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span>24h Whale Volume</span>
            <Activity className="h-4 w-4 text-blue-400" />
          </div>
          <p className="mt-2 font-mono text-2xl sm:text-3xl font-black text-white tabular-nums">
            ${totalWhaleVolume}M
          </p>
          <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-emerald-400">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>20+ Large Orders Tracked</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0E1424] p-5 shadow-xl hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span>Tracked Smart Money</span>
            <Crown className="h-4 w-4 text-amber-400" />
          </div>
          <p className="mt-2 font-mono text-2xl sm:text-3xl font-black text-emerald-400 tabular-nums">
            {FIXTURE_SMART_MONEY.length} Top Funds
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            Avg. Win Rate: <span className="text-white font-bold">78.4%</span>
          </p>
        </div>

        {/* Metric 3 */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0E1424] p-5 shadow-xl hover:border-purple-500/30 transition-all">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span>Largest Order Today</span>
            <Zap className="h-4 w-4 text-purple-400" />
          </div>
          <p className="mt-2 font-mono text-2xl sm:text-3xl font-black text-purple-300 tabular-nums">
            $145,000
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-400 truncate">
            Bitcoin $150K (YES @ 64¢)
          </p>
        </div>

        {/* Metric 4 */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0E1424] p-5 shadow-xl hover:border-cyan-500/30 transition-all">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span>AI Alpha Signals</span>
            <ShieldCheck className="h-4 w-4 text-cyan-400" />
          </div>
          <p className="mt-2 font-mono text-2xl sm:text-3xl font-black text-cyan-300 tabular-nums">
            {FIXTURE_INTELLIGENCE_SIGNALS.length} Active
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            91.2% Conviction Score
          </p>
        </div>
      </div>

      {/* 3. Section Switcher Tabs (All, Whale Feed, Smart Money, AI Alpha) */}
      <div className="mb-6 flex items-center gap-2 border-b border-white/[0.06] pb-3 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveView("all")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer shrink-0",
            activeView === "all"
              ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
              : "text-slate-400 hover:text-white hover:bg-white/5",
          )}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>All Feeds &amp; Overview</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveView("whales")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer shrink-0",
            activeView === "whales"
              ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
              : "text-slate-400 hover:text-white hover:bg-white/5",
          )}
        >
          <Zap className="h-3.5 w-3.5 text-amber-400" />
          <span>Whale Order Stream ({FIXTURE_WHALE_FEED.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveView("smart_money")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer shrink-0",
            activeView === "smart_money"
              ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
              : "text-slate-400 hover:text-white hover:bg-white/5",
          )}
        >
          <Crown className="h-3.5 w-3.5 text-yellow-400" />
          <span>Smart Money Ranks ({FIXTURE_SMART_MONEY.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveView("ai_signals")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer shrink-0",
            activeView === "ai_signals"
              ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
              : "text-slate-400 hover:text-white hover:bg-white/5",
          )}
        >
          <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
          <span>AI Alpha Signals ({FIXTURE_INTELLIGENCE_SIGNALS.length})</span>
        </button>
      </div>

      {/* 4. Search & Multi-Filter Controls */}
      <div className="mb-6 space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Field */}
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search wallet, ENS (satoshi_whale.eth), or market..."
              className="w-full rounded-2xl border border-white/10 bg-[#0E1424] py-3 pl-11 pr-4 text-xs font-semibold text-white placeholder:text-slate-500 outline-none transition-all focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 shadow-inner"
            />
          </div>

          {/* Quick Sizing & Direction Filters */}
          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar">
            {/* Size Filter */}
            <div className="flex items-center rounded-xl bg-[#0E1424] border border-white/10 p-1 text-xs font-bold">
              {(["all", "50k", "100k"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSizeFilter(s)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg transition-all cursor-pointer",
                    sizeFilter === s
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white",
                  )}
                >
                  {s === "all" ? "All Sizes" : s === "50k" ? "$50K+" : "$100K+ ⚡"}
                </button>
              ))}
            </div>

            {/* Side Filter */}
            <div className="flex items-center rounded-xl bg-[#0E1424] border border-white/10 p-1 text-xs font-bold">
              {(["all", "YES", "NO"] as const).map((side) => (
                <button
                  key={side}
                  type="button"
                  onClick={() => setSideFilter(side)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg transition-all cursor-pointer",
                    sideFilter === side
                      ? side === "YES"
                        ? "bg-emerald-600 text-white"
                        : side === "NO"
                        ? "bg-rose-600 text-white"
                        : "bg-blue-600 text-white"
                      : "text-slate-400 hover:text-white",
                  )}
                >
                  {side === "all" ? "All Sides" : `Buy ${side}`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: "all", label: "All Categories" },
            { id: "crypto", label: "₿ Crypto" },
            { id: "macro", label: "🏛️ Macro & Fed" },
            { id: "tech", label: "🚀 Tech & AI" },
            { id: "sports", label: "🏆 Sports" },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all shrink-0 cursor-pointer",
                selectedCategory === cat.id
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "border border-white/10 bg-[#0E1424] text-slate-300 hover:text-white hover:border-white/20",
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 5. AI Alpha Signals Radar (Shown in 'all' or 'ai_signals') */}
      {(activeView === "all" || activeView === "ai_signals") && (
        <section className="mb-10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-cyan-400" />
              <h2 className="font-display text-lg font-bold text-white">
                AI Alpha Signals &amp; Smart Money Radar
              </h2>
              <span className="rounded-full bg-cyan-500/15 px-2.5 py-0.5 font-mono text-[10px] font-bold text-cyan-300 border border-cyan-500/20">
                Live Consensus
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FIXTURE_INTELLIGENCE_SIGNALS.map((sig) => (
              <div
                key={sig.id}
                className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#0E1424] p-5 shadow-xl hover:border-cyan-500/40 transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase mb-2">
                    <span className="inline-flex items-center gap-1 rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 px-2 py-0.5">
                      <Zap className="h-3 w-3" />
                      {sig.signalType.replace("_", " ")}
                    </span>
                    <span className="text-slate-500 font-mono">{sig.timeAgo}</span>
                  </div>

                  <h3 className="font-bold text-white text-sm group-hover:text-cyan-300 transition-colors leading-snug">
                    {sig.title}
                  </h3>

                  <p className="mt-2 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {sig.description}
                  </p>

                  {/* Smart Money vs Retail Divergence Bar */}
                  <div className="mt-4 space-y-1.5 rounded-xl bg-white/[0.02] border border-white/[0.06] p-3">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-400">Smart Money YES Odds</span>
                      <span className="font-mono font-bold text-emerald-400">{sig.smartMoneyOdds}%</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-400">Public Book Odds</span>
                      <span className="font-mono font-bold text-slate-300">{sig.retailOdds}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10 mt-1">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-400"
                        style={{ width: `${sig.smartMoneyOdds}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                  <div className="text-xs">
                    <span className="text-slate-500">Conviction: </span>
                    <strong className="text-white font-mono">{sig.confidence}%</strong>
                  </div>

                  <Link
                    to={`/markets/m/${sig.marketId}`}
                    className="flex items-center gap-1 rounded-xl bg-cyan-600/20 border border-cyan-500/30 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-600 hover:text-white transition-all shadow-sm"
                  >
                    <span>Trade Signal</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 6. Live Whale Activity Feed (Shown in 'all' or 'whales') */}
      {(activeView === "all" || activeView === "whales") && (
        <section className="mb-10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-400" />
              <h2 className="font-display text-lg font-bold text-white">Live Whale Orders Stream</h2>
              <span className="rounded-full bg-blue-500/15 px-2.5 py-0.5 font-mono text-[10px] font-bold text-blue-300 border border-blue-500/20">
                {filteredWhales.length} Trades Fills
              </span>
            </div>
            <span className="text-xs font-semibold text-slate-400">Real-time Order Feed</span>
          </div>

          <div className="space-y-3">
            {filteredWhales.map((whale) => (
              <div
                key={whale.id}
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-[#0E1424] p-4.5 shadow-xl hover:border-blue-500/40 hover:bg-[#131B30] transition-all"
              >
                {/* Left: Wallet Avatar + ENS + Market Question */}
                <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 font-mono text-xs font-black text-white shadow-md">
                    {whale.ens ? whale.ens.slice(0, 2).toUpperCase() : "0X"}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        to={walletProfilePath(whale.wallet)}
                        className="font-mono text-xs font-bold text-blue-400 hover:underline"
                      >
                        {whale.ens || shortWallet(whale.wallet)}
                      </Link>
                      <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 font-mono">
                        {shortWallet(whale.wallet)}
                      </span>
                      <span className="rounded bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 uppercase font-mono">
                        {whale.category}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500">{whale.timestamp}</span>
                    </div>

                    <Link
                      to={`/markets/m/${whale.marketId || "market-1"}`}
                      className="mt-1 line-clamp-1 text-sm font-semibold text-white group-hover:text-blue-300 transition-colors block"
                    >
                      {whale.market}
                    </Link>
                  </div>
                </div>

                {/* Right: Side Badge + Size in USDC + Follow Action */}
                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 border-white/[0.06] pt-3 sm:pt-0">
                  <div className="text-left sm:text-right">
                    <span
                      className={cn(
                        "inline-block rounded-lg px-2.5 py-0.5 text-xs font-black uppercase tracking-wider font-mono",
                        whale.side === "YES"
                          ? "bg-[#1B3629] text-[#22C55E] border border-[#22C55E]/30"
                          : "bg-[#381E23] text-[#EF4444] border border-[#EF4444]/30",
                      )}
                    >
                      BOUGHT {whale.side} @ {whale.priceCents}¢
                    </span>
                    <p className="mt-1 font-mono text-base font-black text-white tabular-nums">
                      ${whale.sizeUsd.toLocaleString()}{" "}
                      <span className="text-xs font-semibold text-slate-400">USDC</span>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleFollow(whale.wallet)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer",
                      following[whale.wallet]
                        ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-blue-600 text-white hover:bg-blue-500 shadow-md shadow-blue-600/20",
                    )}
                  >
                    {following[whale.wallet] ? <Check className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                    <span>{following[whale.wallet] ? "Following" : "Follow"}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 7. Smart Money Leaderboard Podium & Top 20 Table (Shown in 'all' or 'smart_money') */}
      {(activeView === "all" || activeView === "smart_money") && (
        <section className="mt-10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-400" />
              <h2 className="font-display text-lg font-bold text-white">Smart Money Leaderboard (Top 20)</h2>
            </div>
            <Link
              to={intelligenceSmartMoneyPath()}
              className="flex items-center gap-1 text-xs font-bold text-blue-400 hover:text-blue-300"
            >
              <span>Dedicated Leaderboard Page</span>
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Top 3 Podium Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {filteredSmartMoney.slice(0, 3).map((row) => (
              <div
                key={row.rank}
                className={cn(
                  "relative rounded-2xl border p-5 shadow-xl transition-all",
                  row.rank === 1
                    ? "border-amber-500/40 bg-gradient-to-b from-amber-500/10 via-[#0E1424] to-[#0E1424]"
                    : row.rank === 2
                    ? "border-slate-400/40 bg-gradient-to-b from-slate-400/10 via-[#0E1424] to-[#0E1424]"
                    : "border-orange-500/40 bg-gradient-to-b from-orange-500/10 via-[#0E1424] to-[#0E1424]",
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "inline-flex items-center justify-center rounded-xl px-2.5 py-1 text-xs font-black border",
                      RANK_MEDALS[row.rank]?.bg,
                      RANK_MEDALS[row.rank]?.border,
                      RANK_MEDALS[row.rank]?.text,
                    )}
                  >
                    {RANK_MEDALS[row.rank]?.label}
                  </span>

                  <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/15 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                    {row.roi} ROI
                  </span>
                </div>

                <div className="mt-4">
                  <div className="flex items-center gap-2">
                    <Link
                      to={walletProfilePath(row.wallet)}
                      className="font-mono text-sm font-bold text-white hover:text-blue-400 transition-colors"
                    >
                      {row.ens || shortWallet(row.wallet)}
                    </Link>
                    {row.ens && (
                      <span className="text-[10px] text-slate-500 font-mono">
                        {shortWallet(row.wallet)}
                      </span>
                    )}
                  </div>

                  <div className="mt-1 text-xs text-blue-400 font-semibold">
                    {row.specialty}
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-white/[0.06] pt-2">
                    <span>Win Rate: <strong className="text-white font-mono">{row.winRate}</strong></span>
                    <span>Profit: <strong className="text-emerald-400 font-mono">{row.profitUsd}</strong></span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleFollow(row.wallet)}
                  className={cn(
                    "mt-4 w-full flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all cursor-pointer",
                    following[row.wallet]
                      ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-blue-600 text-white hover:bg-blue-500 shadow-md shadow-blue-600/20",
                  )}
                >
                  {following[row.wallet] ? <Check className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                  <span>{following[row.wallet] ? "Following" : "Follow Trades"}</span>
                </button>
              </div>
            ))}
          </div>

          {/* Full Top 20 Ranked Table */}
          <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0E1424] shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/[0.06] bg-white/[0.02] text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Rank</th>
                    <th className="px-5 py-3.5">Smart Wallet / Fund</th>
                    <th className="px-5 py-3.5">Specialty</th>
                    <th className="px-5 py-3.5">ROI (%)</th>
                    <th className="px-5 py-3.5">Win Rate</th>
                    <th className="px-5 py-3.5">Total Profit</th>
                    <th className="px-5 py-3.5">30D Volume</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredSmartMoney.map((row) => (
                    <tr key={row.rank} className="hover:bg-white/[0.03] transition-colors">
                      <td className="px-5 py-3.5 font-mono font-bold text-slate-300">#{row.rank}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col">
                          <Link
                            to={walletProfilePath(row.wallet)}
                            className="font-mono text-xs font-bold text-blue-400 hover:underline"
                          >
                            {row.ens || shortWallet(row.wallet)}
                          </Link>
                          {row.ens && (
                            <span className="text-[10px] text-slate-500 font-mono">
                              {shortWallet(row.wallet)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="rounded-md bg-white/5 border border-white/10 px-2 py-0.5 text-[11px] font-semibold text-slate-300">
                          {row.specialty}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono font-bold text-emerald-400">{row.roi}</span>
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-300"
                              style={{ width: `${Math.min(100, Number.parseInt(row.roi, 10))}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-mono font-bold text-white">{row.winRate}</td>
                      <td className="px-5 py-3.5 font-mono font-bold text-emerald-400">{row.profitUsd}</td>
                      <td className="px-5 py-3.5 font-mono text-slate-300">{row.volumeUsd}</td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => toggleFollow(row.wallet)}
                          className={cn(
                            "rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer",
                            following[row.wallet]
                              ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-blue-600 text-white hover:bg-blue-500",
                          )}
                        >
                          {following[row.wallet] ? "Following" : "Follow"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </MarketsAppShell>
  );
}

export default IntelligenceHubPage;
