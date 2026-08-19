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
} from "lucide-react";

import { cn } from "@/shared/lib/utils";
import { MarketsAppShell } from "../components/shell/MarketsAppShell";
import { FIXTURE_SMART_MONEY, FIXTURE_WHALE_FEED } from "../intelligence/fixtures/devFixtures";
import {
  intelligenceFollowingPath,
  intelligencePaperPath,
  intelligenceSmartMoneyPath,
  walletProfilePath,
} from "../routes/paths";

interface WhaleItem {
  id: string;
  wallet: string;
  ens?: string;
  market: string;
  side: "YES" | "NO";
  sizeUsd: number;
  timestamp: string;
  category: "crypto" | "macro" | "tech" | "sports";
}

const EXTENDED_WHALE_FEED: WhaleItem[] = [
  {
    id: "wh-1",
    wallet: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    ens: "satoshi_whale.eth",
    market: "Will Bitcoin hit $150,000 before January 1, 2027?",
    side: "YES",
    sizeUsd: 125000,
    timestamp: "2 mins ago",
    category: "crypto",
  },
  {
    id: "wh-2",
    wallet: "0x1111111254fb6c44bac0bed2854e76f90643097d",
    ens: "alpha_venture.eth",
    market: "Fed Decision in September: No change or rate cut?",
    side: "YES",
    sizeUsd: 84000,
    timestamp: "7 mins ago",
    category: "macro",
  },
  {
    id: "wh-3",
    wallet: "0x8ba1f109551bD432803012645Ac136ddd64DBA72",
    ens: "deepmind_insider.eth",
    market: "Anthropic IPO by December 31, 2026?",
    side: "YES",
    sizeUsd: 65000,
    timestamp: "18 mins ago",
    category: "tech",
  },
  {
    id: "wh-4",
    wallet: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    ens: "vitalik.eth",
    market: "SpaceX Starship Booster Mechazilla Catch Success?",
    side: "YES",
    sizeUsd: 48500,
    timestamp: "35 mins ago",
    category: "tech",
  },
  {
    id: "wh-5",
    wallet: "0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE",
    ens: "binance_arb.eth",
    market: "Strait of Hormuz traffic returns to normal by September 30?",
    side: "NO",
    sizeUsd: 32000,
    timestamp: "1 hour ago",
    category: "macro",
  },
  {
    id: "wh-6",
    wallet: "0x28C6c06298d514Db089934071355E5743bf21d60",
    ens: "solana_degen.eth",
    market: "Will Solana hit $500 in 2026?",
    side: "YES",
    sizeUsd: 28000,
    timestamp: "2 hours ago",
    category: "crypto",
  },
];

const RANK_MEDALS: Record<number, { label: string; bg: string; border: string; text: string }> = {
  1: { label: "🥇 #1", bg: "bg-amber-500/20", border: "border-amber-500/40", text: "text-amber-300" },
  2: { label: "🥈 #2", bg: "bg-slate-300/20", border: "border-slate-300/40", text: "text-slate-200" },
  3: { label: "🥉 #3", bg: "bg-orange-500/20", border: "border-orange-500/40", text: "text-orange-300" },
};

function shortWallet(wallet: string): string {
  return wallet.length > 12 ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : wallet;
}

export function IntelligenceHubPage() {
  const [activeTab, setActiveTab] = useState<"all" | "whales" | "smart_money">("all");
  const [searchWallet, setSearchWallet] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [following, setFollowing] = useState<Record<string, boolean>>({});

  const toggleFollow = (wallet: string) => {
    setFollowing((prev) => ({ ...prev, [wallet]: !prev[wallet] }));
  };

  const filteredWhales = useMemo(() => {
    let list = EXTENDED_WHALE_FEED;
    if (selectedCategory !== "all") {
      list = list.filter((w) => w.category === selectedCategory);
    }
    if (searchWallet.trim()) {
      const q = searchWallet.trim().toLowerCase();
      list = list.filter(
        (w) =>
          w.wallet.toLowerCase().includes(q) ||
          (w.ens && w.ens.toLowerCase().includes(q)) ||
          w.market.toLowerCase().includes(q),
      );
    }
    return list;
  }, [selectedCategory, searchWallet]);

  return (
    <MarketsAppShell title="Intelligence Hub - RetroPick">
      {/* 1. Ultra-Premium Header Hero Banner */}
      <div className="relative mb-8 overflow-hidden rounded-3xl border border-blue-500/30 bg-gradient-to-r from-[#090D18] via-[#0F172A] to-[#0A0E1A] p-6 sm:p-8 shadow-2xl shadow-blue-950/30">
        {/* Ambient Radial Glow */}
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
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/30">
                  <Radio className="h-3 w-3 animate-pulse" />
                  Live Radar
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-300 max-w-2xl leading-relaxed">
                Institutional-grade predictive intelligence: track high-stakes whale orders, discover top ROI Smart Money wallets, and monitor real-time AI odds sentiment.
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
              <span>Smart Money</span>
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
        <div className="rounded-2xl border border-white/[0.08] bg-[#181C28] p-5 shadow-xl hover:border-blue-500/30 transition-all">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span>24h Whale Volume</span>
            <Activity className="h-4 w-4 text-blue-400" />
          </div>
          <p className="mt-2 font-mono text-2xl sm:text-3xl font-black text-white tabular-nums">
            $14.8M
          </p>
          <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-emerald-400">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>+18.4% vs yesterday</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#181C28] p-5 shadow-xl hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span>Tracked Smart Money</span>
            <Crown className="h-4 w-4 text-amber-400" />
          </div>
          <p className="mt-2 font-mono text-2xl sm:text-3xl font-black text-emerald-400 tabular-nums">
            248 Wallets
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            Avg. Win Rate: <span className="text-white font-bold">81.6%</span>
          </p>
        </div>

        {/* Metric 3 */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#181C28] p-5 shadow-xl hover:border-purple-500/30 transition-all">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span>Largest Order Today</span>
            <Zap className="h-4 w-4 text-purple-400" />
          </div>
          <p className="mt-2 font-mono text-2xl sm:text-3xl font-black text-purple-300 tabular-nums">
            $125,000
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-400 truncate">
            Bitcoin $150K (YES @ 64¢)
          </p>
        </div>

        {/* Metric 4 */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#181C28] p-5 shadow-xl hover:border-cyan-500/30 transition-all">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span>AI Signal Accuracy</span>
            <ShieldCheck className="h-4 w-4 text-cyan-400" />
          </div>
          <p className="mt-2 font-mono text-2xl sm:text-3xl font-black text-cyan-300 tabular-nums">
            89.4%
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            48 verified market resolutions
          </p>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search Field */}
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchWallet}
            onChange={(e) => setSearchWallet(e.target.value)}
            placeholder="Search wallet, ENS (vitalik.eth), or market..."
            className="w-full rounded-2xl border border-white/10 bg-[#181C28] py-3.5 pl-11 pr-4 text-sm font-semibold text-white placeholder:text-slate-500 outline-none transition-all focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 shadow-inner"
          />
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 no-scrollbar">
          {[
            { id: "all", label: "All Feeds" },
            { id: "crypto", label: "₿ Crypto" },
            { id: "macro", label: "🏛️ Macro & Fed" },
            { id: "tech", label: "🚀 Tech & AI" },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "rounded-xl px-4 py-2.5 text-xs font-bold transition-all shrink-0 cursor-pointer",
                selectedCategory === cat.id
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                  : "border border-white/10 bg-[#181C28] text-slate-300 hover:text-white hover:border-white/20",
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Live Whale Activity Feed (Cards List) */}
      <div className="mb-10 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-400" />
            <h2 className="font-display text-lg font-bold text-white">Live Whale Activity Orders</h2>
            <span className="rounded-full bg-blue-500/15 px-2.5 py-0.5 font-mono text-[10px] font-bold text-blue-300 border border-blue-500/20">
              Orders $5,000+ USDC
            </span>
          </div>
          <span className="text-xs font-semibold text-slate-400">Showing {filteredWhales.length} large trades</span>
        </div>

        <div className="space-y-3">
          {filteredWhales.map((whale) => (
            <div
              key={whale.id}
              className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-[#181C28] p-4.5 shadow-xl hover:border-blue-500/40 hover:bg-[#1C2130] transition-all"
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
                    <span className="text-[10px] font-semibold text-slate-500">{whale.timestamp}</span>
                  </div>

                  <p className="mt-1 line-clamp-1 text-sm font-semibold text-white group-hover:text-blue-300 transition-colors">
                    {whale.market}
                  </p>
                </div>
              </div>

              {/* Right: Side Badge + Size in USDC + Action Buttons */}
              <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 border-white/[0.06] pt-3 sm:pt-0">
                <div className="text-left sm:text-right">
                  <span
                    className={cn(
                      "inline-block rounded-lg px-2.5 py-1 text-xs font-black uppercase tracking-wider",
                      whale.side === "YES"
                        ? "bg-[#1B3629] text-[#22C55E] border border-[#22C55E]/30"
                        : "bg-[#381E23] text-[#EF4444] border border-[#EF4444]/30",
                    )}
                  >
                    BOUGHT {whale.side}
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
      </div>

      {/* 5. Smart Money Leaderboard Podium & Ranked Table */}
      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-400" />
            <h2 className="font-display text-lg font-bold text-white">Smart Money Leaderboard</h2>
          </div>
          <Link
            to={intelligenceSmartMoneyPath()}
            className="flex items-center gap-1 text-xs font-bold text-blue-400 hover:text-blue-300"
          >
            <span>View Full Rankings</span>
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Top 3 Podium Cards */}
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {FIXTURE_SMART_MONEY.slice(0, 3).map((row) => (
            <div
              key={row.rank}
              className={cn(
                "relative rounded-2xl border p-5 shadow-xl transition-all",
                row.rank === 1
                  ? "border-amber-500/40 bg-gradient-to-b from-amber-500/10 via-[#181C28] to-[#181C28]"
                  : row.rank === 2
                  ? "border-slate-400/40 bg-gradient-to-b from-slate-400/10 via-[#181C28] to-[#181C28]"
                  : "border-orange-500/40 bg-gradient-to-b from-orange-500/10 via-[#181C28] to-[#181C28]",
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
                <Link
                  to={walletProfilePath(row.wallet)}
                  className="font-mono text-sm font-bold text-white hover:text-blue-400 transition-colors"
                >
                  {shortWallet(row.wallet)}
                </Link>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                  <span>Win Rate: <strong className="text-white">{row.winRate}</strong></span>
                  <span>Volume: <strong className="text-white">{row.volumeUsd}</strong></span>
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

        {/* Full Table */}
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#181C28] shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/[0.06] bg-white/[0.02] text-slate-400 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Rank</th>
                  <th className="px-5 py-3.5">Smart Wallet</th>
                  <th className="px-5 py-3.5">ROI (%)</th>
                  <th className="px-5 py-3.5">Win Rate</th>
                  <th className="px-5 py-3.5">Total Volume</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {FIXTURE_SMART_MONEY.map((row) => (
                  <tr key={row.rank} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-slate-300">#{row.rank}</td>
                    <td className="px-5 py-4">
                      <Link
                        to={walletProfilePath(row.wallet)}
                        className="font-mono text-xs font-bold text-blue-400 hover:underline"
                      >
                        {shortWallet(row.wallet)}
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-emerald-400">{row.roi}</span>
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-300"
                            style={{ width: `${Math.min(100, Number.parseInt(row.roi, 10))}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono font-bold text-white">{row.winRate}</td>
                    <td className="px-5 py-4 font-mono text-slate-300">{row.volumeUsd}</td>
                    <td className="px-5 py-4 text-right">
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
    </MarketsAppShell>
  );
}

export default IntelligenceHubPage;
