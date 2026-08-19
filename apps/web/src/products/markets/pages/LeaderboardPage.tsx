import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Trophy, UserPlus, Check, Award, Zap, ArrowUpRight } from "lucide-react";
import { MarketsAppShell } from "../components/shell/MarketsAppShell";
import { cn } from "@/shared/lib/utils";

interface Trader {
  rank: number;
  name: string;
  avatar: string;
  pnlUsd: number;
  winRatePercent: number;
  totalVolumeUsd: string;
  topMarket: string;
}

const TOP_TRADERS: Trader[] = [
  {
    rank: 1,
    name: "SatoshiPredictor",
    avatar: "🥷",
    pnlUsd: 142500,
    winRatePercent: 88.4,
    totalVolumeUsd: "$1.4M",
    topMarket: "Bitcoin $150K",
  },
  {
    rank: 2,
    name: "WhaleAlpha_99",
    avatar: "🐋",
    pnlUsd: 98200,
    winRatePercent: 81.2,
    totalVolumeUsd: "$890K",
    topMarket: "Anthropic IPO",
  },
  {
    rank: 3,
    name: "CryptoOracle",
    avatar: "🔮",
    pnlUsd: 74100,
    winRatePercent: 79.6,
    totalVolumeUsd: "$650K",
    topMarket: "Solana $500",
  },
  {
    rank: 4,
    name: "EsportsTitan",
    avatar: "🎮",
    pnlUsd: 53800,
    winRatePercent: 76.0,
    totalVolumeUsd: "$420K",
    topMarket: "T1 vs Gen.G LCK",
  },
  {
    rank: 5,
    name: "MacroTactician",
    avatar: "📊",
    pnlUsd: 41200,
    winRatePercent: 73.5,
    totalVolumeUsd: "$380K",
    topMarket: "Fed Rate Cut Q3",
  },
  {
    rank: 6,
    name: "PolitiQuant",
    avatar: "🏛️",
    pnlUsd: 36900,
    winRatePercent: 71.0,
    totalVolumeUsd: "$310K",
    topMarket: "Balance of Power 2026",
  },
  {
    rank: 7,
    name: "AI_Singularity",
    avatar: "🤖",
    pnlUsd: 29400,
    winRatePercent: 68.8,
    totalVolumeUsd: "$260K",
    topMarket: "OpenAI GPT-6",
  },
];

interface WhaleTrade {
  id: string;
  traderName: string;
  traderAvatar: string;
  marketTitle: string;
  marketId: string;
  side: "YES" | "NO";
  amountUsd: number;
  priceShares: number;
  timeAgo: string;
}

const WHALE_TRADES: WhaleTrade[] = [
  {
    id: "wt-1",
    traderName: "WhaleAlpha_99",
    traderAvatar: "🐋",
    marketTitle: "Will Bitcoin hit $150,000 before January 1, 2027?",
    marketId: "btc-150k-2027",
    side: "YES",
    amountUsd: 45000,
    priceShares: 66,
    timeAgo: "2 mins ago",
  },
  {
    id: "wt-2",
    traderName: "SatoshiPredictor",
    traderAvatar: "🥷",
    marketTitle: "Fed Decision in September?",
    marketId: "fed-decision-september",
    side: "YES",
    amountUsd: 28500,
    priceShares: 71,
    timeAgo: "14 mins ago",
  },
  {
    id: "wt-3",
    traderName: "MacroTactician",
    traderAvatar: "📊",
    marketTitle: "Strait of Hormuz traffic returns to normal by September 30?",
    marketId: "strait-of-hormuz",
    side: "NO",
    amountUsd: 18200,
    priceShares: 91,
    timeAgo: "45 mins ago",
  },
  {
    id: "wt-4",
    traderName: "CryptoOracle",
    traderAvatar: "🔮",
    marketTitle: "US announces end of Iranian blockade by...?",
    marketId: "us-iranian-blockade",
    side: "YES",
    amountUsd: 12400,
    priceShares: 71,
    timeAgo: "1 hour ago",
  },
  {
    id: "wt-5",
    traderName: "EsportsTitan",
    traderAvatar: "🎮",
    marketTitle: "Florida Governor Republican Primary Winner",
    marketId: "florida-governor-winner",
    side: "YES",
    amountUsd: 11000,
    priceShares: 99,
    timeAgo: "2 hours ago",
  },
];

export function LeaderboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") === "whales" ? "whales" : "traders";
  const [timeframe, setTimeframe] = useState<"24h" | "7d" | "30d" | "all">("7d");
  const [following, setFollowing] = useState<Record<string, boolean>>({});

  const toggleFollow = (name: string) => {
    setFollowing((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const handleTabChange = (tab: "traders" | "whales") => {
    setSearchParams({ tab });
  };

  return (
    <MarketsAppShell title="Leaderboard - RetroPick">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header Title & Sub-Tab Switcher */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-blue-500/15 pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Trophy className="h-7 w-7 text-amber-400" />
              Leaderboard & Smart Money
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Pantau peringkat trader dengan performa terbaik dan aliran dana paus (*Whales*) secara real-time.
            </p>
          </div>

          {/* Tab Pills */}
          <div className="flex items-center gap-2 rounded-2xl bg-[#0B101C] p-1.5 border border-blue-500/20 shadow-inner shrink-0">
            <button
              type="button"
              onClick={() => handleTabChange("traders")}
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer",
                activeTab === "traders"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                  : "text-slate-400 hover:text-white",
              )}
            >
              <Trophy className="h-4 w-4 text-amber-300" />
              <span>Top Traders</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("whales")}
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer",
                activeTab === "whales"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                  : "text-slate-400 hover:text-white",
              )}
            >
              <Zap className="h-4 w-4 text-cyan-300" />
              <span>Whale Tracker</span>
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* TAB 1: TOP TRADERS                                           */}
        {/* ============================================================ */}
        {activeTab === "traders" && (
          <div className="space-y-6">
            {/* Timeframe Filter Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {(["24h", "7d", "30d", "all"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTimeframe(t)}
                    className={cn(
                      "rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer border",
                      timeframe === t
                        ? "bg-[#192748] border-blue-500 text-white shadow-sm shadow-blue-600/20"
                        : "bg-[#101726]/80 border-blue-500/10 text-slate-400 hover:bg-[#152038] hover:text-slate-200",
                    )}
                  >
                    {t === "all" ? "All-Time" : t.toUpperCase()}
                  </button>
                ))}
              </div>
              <span className="text-xs font-semibold text-slate-400">
                Diperbarui 1 menit yang lalu
              </span>
            </div>

            {/* Top 3 Podium Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {TOP_TRADERS.slice(0, 3).map((trader) => (
                <div
                  key={trader.rank}
                  className={cn(
                    "relative overflow-hidden rounded-2xl border p-5 transition-all shadow-xl",
                    trader.rank === 1
                      ? "border-amber-500/40 bg-gradient-to-b from-amber-500/10 via-[#101726] to-[#0A0F1D]"
                      : trader.rank === 2
                      ? "border-slate-400/30 bg-gradient-to-b from-slate-400/10 via-[#101726] to-[#0A0F1D]"
                      : "border-amber-700/30 bg-gradient-to-b from-amber-700/10 via-[#101726] to-[#0A0F1D]",
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{trader.avatar}</span>
                      <div>
                        <h3 className="font-bold text-white text-base">{trader.name}</h3>
                        <span className="text-xs text-slate-400">Rank #{trader.rank}</span>
                      </div>
                    </div>
                    <Award
                      className={cn(
                        "h-6 w-6",
                        trader.rank === 1
                          ? "text-amber-400"
                          : trader.rank === 2
                          ? "text-slate-300"
                          : "text-amber-600",
                      )}
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/5 pt-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Total Profit</span>
                      <p className="text-base font-black text-emerald-400 font-mono">
                        +${trader.pnlUsd.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Win Rate</span>
                      <p className="text-base font-black text-blue-400 font-mono">
                        {trader.winRatePercent}%
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleFollow(trader.name)}
                    className={cn(
                      "mt-4 w-full rounded-xl py-2 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                      following[trader.name]
                        ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-blue-600 text-white hover:bg-blue-500 shadow-md shadow-blue-600/20",
                    )}
                  >
                    {following[trader.name] ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>Following</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-3.5 w-3.5" />
                        <span>Follow Trader</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>

            {/* Traders Table */}
            <div className="overflow-hidden rounded-2xl border border-blue-500/15 bg-[#101726]/95 shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-blue-500/10 bg-[#090E1A]/80 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-5 py-3.5">Rank</th>
                      <th className="px-5 py-3.5">Trader</th>
                      <th className="px-5 py-3.5">Profit & Loss</th>
                      <th className="px-5 py-3.5">Win Rate</th>
                      <th className="px-5 py-3.5">Volume</th>
                      <th className="px-5 py-3.5">Top Market</th>
                      <th className="px-5 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {TOP_TRADERS.map((trader) => (
                      <tr key={trader.rank} className="hover:bg-blue-600/5 transition-colors">
                        <td className="px-5 py-4 font-mono font-bold text-slate-400">
                          #{trader.rank}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2.5">
                            <span className="text-xl">{trader.avatar}</span>
                            <span className="font-bold text-white">{trader.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 font-mono font-bold text-emerald-400">
                          +${trader.pnlUsd.toLocaleString()}
                        </td>
                        <td className="px-5 py-4 font-mono font-bold text-blue-400">
                          {trader.winRatePercent}%
                        </td>
                        <td className="px-5 py-4 font-mono text-slate-300 font-medium">
                          {trader.totalVolumeUsd}
                        </td>
                        <td className="px-5 py-4 text-xs font-semibold text-slate-300">
                          {trader.topMarket}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => toggleFollow(trader.name)}
                            className={cn(
                              "rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer",
                              following[trader.name]
                                ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30"
                                : "bg-white/10 text-white hover:bg-blue-600",
                            )}
                          >
                            {following[trader.name] ? "Following" : "Follow"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: WHALE TRACKER                                         */}
        {/* ============================================================ */}
        {activeTab === "whales" && (
          <div className="space-y-6">
            {/* Whale Stats Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-blue-500/15 bg-[#101726]/95 p-4 shadow-xl">
                <span className="text-xs font-bold text-slate-400 uppercase">Whale Inflow 24h</span>
                <p className="mt-1 text-2xl font-black text-white font-mono">$1,420,000</p>
                <span className="text-[11px] text-emerald-400 font-semibold">↗ +18.4% vs kemarin</span>
              </div>
              <div className="rounded-2xl border border-blue-500/15 bg-[#101726]/95 p-4 shadow-xl">
                <span className="text-xs font-bold text-slate-400 uppercase">Largest Trade Today</span>
                <p className="mt-1 text-2xl font-black text-cyan-400 font-mono">$45,000 USDC</p>
                <span className="text-[11px] text-slate-400">Bitcoin $150K YES</span>
              </div>
              <div className="rounded-2xl border border-blue-500/15 bg-[#101726]/95 p-4 shadow-xl">
                <span className="text-xs font-bold text-slate-400 uppercase">Active Whales Monitored</span>
                <p className="mt-1 text-2xl font-black text-amber-400 font-mono">148 Wallets</p>
                <span className="text-[11px] text-slate-400">Transaksi &gt; $10k</span>
              </div>
            </div>

            {/* Whale Transactions Feed */}
            <div className="rounded-2xl border border-blue-500/15 bg-[#101726]/95 p-5 shadow-xl">
              <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <Zap className="h-4 w-4 text-cyan-400" />
                Live Whale Transaction Stream
              </h2>

              <div className="space-y-3">
                {WHALE_TRADES.map((trade) => (
                  <div
                    key={trade.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-blue-500/10 bg-[#0A0F1D]/80 p-4 transition-all hover:border-blue-500/30"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="text-2xl">{trade.traderAvatar}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{trade.traderName}</span>
                          <span className="text-[11px] text-slate-400 font-mono">{trade.timeAgo}</span>
                        </div>
                        <Link
                          to={`/markets/m/${trade.marketId}`}
                          className="text-xs text-slate-300 hover:text-blue-400 font-semibold line-clamp-1 mt-0.5"
                        >
                          {trade.marketTitle}
                        </Link>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <span
                        className={cn(
                          "rounded-lg px-2.5 py-1 text-xs font-black",
                          trade.side === "YES"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-rose-500/20 text-rose-400 border border-rose-500/30",
                        )}
                      >
                        {trade.side} @ {trade.priceShares}¢
                      </span>
                      <div className="text-right">
                        <span className="text-sm font-black text-white font-mono">
                          ${trade.amountUsd.toLocaleString()}
                        </span>
                        <span className="block text-[10px] text-slate-400 uppercase font-bold">USDC</span>
                      </div>
                      <Link
                        to={`/markets/m/${trade.marketId}`}
                        className="rounded-lg p-2 text-slate-400 hover:bg-blue-600/20 hover:text-white transition-colors"
                      >
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </MarketsAppShell>
  );
}

export default LeaderboardPage;
