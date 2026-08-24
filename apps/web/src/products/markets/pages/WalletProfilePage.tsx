"use client";

import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Crown,
  ArrowLeft,
  UserPlus,
  Check,
  TrendingUp,
  Activity,
  Award,
  Zap,
  ExternalLink,
  ShieldCheck,
  BarChart2,
} from "lucide-react";

import { cn } from "@/shared/lib/utils";
import { MarketsAppShell } from "../components/shell/MarketsAppShell";
import { FIXTURE_SMART_MONEY, FIXTURE_WHALE_FEED } from "../intelligence/fixtures/devFixtures";
import { intelligencePath } from "../routes/paths";

export function WalletProfilePage() {
  const { address = "" } = useParams();
  const decoded = decodeURIComponent(address);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState<"positions" | "history">("positions");

  // Find matching Smart Money profile
  const smartMoneyMatch = FIXTURE_SMART_MONEY.find(
    (s) =>
      s.wallet.toLowerCase() === decoded.toLowerCase() ||
      (s.ens && s.ens.toLowerCase() === decoded.toLowerCase()),
  );

  const whaleTrades = FIXTURE_WHALE_FEED.filter(
    (w) =>
      w.wallet.toLowerCase() === decoded.toLowerCase() ||
      (w.ens && w.ens.toLowerCase() === decoded.toLowerCase()),
  );

  const ensName = smartMoneyMatch?.ens || (decoded.includes(".eth") ? decoded : undefined);
  const displayName = ensName || (decoded.length > 12 ? `${decoded.slice(0, 6)}…${decoded.slice(-4)}` : decoded);
  const roi = smartMoneyMatch?.roi || "+142.5%";
  const winRate = smartMoneyMatch?.winRate || "78.2%";
  const volumeUsd = smartMoneyMatch?.volumeUsd || "$4.8M";
  const profitUsd = smartMoneyMatch?.profitUsd || "+$940,000";
  const specialty = smartMoneyMatch?.specialty || "Alpha Directional Quant";
  const rank = smartMoneyMatch?.rank;

  return (
    <MarketsAppShell title={`${displayName} - Smart Money Profile`}>
      <div className="mx-auto max-w-7xl space-y-6">
        <Link
          to={intelligencePath()}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Intelligence Hub</span>
        </Link>

        {/* Profile Card Header */}
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-r from-[#0C1222] via-[#10172A] to-[#0C1222] p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 text-lg font-black text-white shadow-xl">
                {ensName ? ensName.slice(0, 2).toUpperCase() : decoded.slice(2, 4).toUpperCase() || "0X"}
                {rank && rank <= 3 && (
                  <span className="absolute -top-1.5 -right-1.5 rounded-full bg-amber-500 p-1 text-[10px] shadow-md">
                    👑
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="font-display text-xl sm:text-2xl font-black text-white">
                    {displayName}
                  </h1>
                  {rank && (
                    <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-2.5 py-0.5 text-xs font-bold text-amber-300 font-mono">
                      Rank #{rank}
                    </span>
                  )}
                  <span className="rounded-md bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 text-[11px] font-bold text-blue-300">
                    Verified Smart Money
                  </span>
                </div>

                <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                  <span className="font-mono">{decoded}</span>
                  <a
                    href={`https://polygonscan.com/address/${decoded}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-slate-500 hover:text-white transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                <p className="mt-1.5 text-xs font-semibold text-blue-400">
                  Specialty: {specialty}
                </p>
              </div>
            </div>

            {/* Action Follow Button */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsFollowing(!isFollowing)}
                className={cn(
                  "flex items-center gap-2 rounded-2xl px-5 py-3 text-xs font-bold transition-all shadow-lg cursor-pointer",
                  isFollowing
                    ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-blue-600 text-white hover:bg-blue-500 shadow-blue-600/30",
                )}
              >
                {isFollowing ? <Check className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                <span>{isFollowing ? "Following Trades" : "Follow Wallet"}</span>
              </button>
            </div>
          </div>

          {/* Performance Stats Tiles */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 pt-4 border-t border-white/[0.06]">
            <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                TOTAL VERIFIED ROI
              </span>
              <div className="mt-1 font-mono text-xl font-black text-emerald-400">
                {roi}
              </div>
            </div>

            <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                WIN RATE
              </span>
              <div className="mt-1 font-mono text-xl font-black text-white">
                {winRate}
              </div>
            </div>

            <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                CUMULATIVE PROFIT
              </span>
              <div className="mt-1 font-mono text-xl font-black text-emerald-400">
                {profitUsd}
              </div>
            </div>

            <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                30D TRADING VOLUME
              </span>
              <div className="mt-1 font-mono text-xl font-black text-slate-200">
                {volumeUsd}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="space-y-4 rounded-2xl border border-white/[0.08] bg-[#0E1424] p-5 shadow-xl">
          <div className="flex items-center gap-6 border-b border-white/[0.06] pb-3">
            <button
              type="button"
              onClick={() => setActiveTab("positions")}
              className={cn(
                "flex items-center gap-2 text-xs font-bold pb-1 cursor-pointer transition-all",
                activeTab === "positions"
                  ? "text-white font-black border-b-2 border-blue-500"
                  : "text-slate-400 hover:text-white",
              )}
            >
              <Activity className="h-4 w-4 text-blue-400" />
              <span>Recent Large Trades ({whaleTrades.length > 0 ? whaleTrades.length : 2})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={cn(
                "flex items-center gap-2 text-xs font-bold pb-1 cursor-pointer transition-all",
                activeTab === "history"
                  ? "text-white font-black border-b-2 border-blue-500"
                  : "text-slate-400 hover:text-white",
              )}
            >
              <BarChart2 className="h-4 w-4 text-emerald-400" />
              <span>Resolved Track Record</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="space-y-3 pt-1">
            {(whaleTrades.length > 0
              ? whaleTrades
              : [
                  {
                    id: "wt-1",
                    market: "Will Bitcoin hit $150,000 before January 1, 2027?",
                    marketId: "btc-150k-2027",
                    side: "YES" as const,
                    sizeUsd: 145000,
                    priceCents: 64,
                    timestamp: "Today",
                    category: "crypto" as const,
                    txHash: "0x89ab...34fe",
                    wallet: decoded,
                  },
                  {
                    id: "wt-2",
                    market: "Will NVIDIA reach $5 Trillion market cap in 2026?",
                    marketId: "nvidia-market-cap-5t",
                    side: "YES" as const,
                    sizeUsd: 85000,
                    priceCents: 77,
                    timestamp: "Yesterday",
                    category: "tech" as const,
                    txHash: "0x24ff...bb80",
                    wallet: decoded,
                  },
                ]
            ).map((trade) => (
              <div
                key={trade.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 hover:bg-white/[0.04] transition-all"
              >
                <div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mb-1 font-mono">
                    <span className="uppercase text-blue-400 font-bold">{trade.category}</span>
                    <span>·</span>
                    <span>{trade.timestamp}</span>
                    <span>·</span>
                    <span>Tx: {trade.txHash}</span>
                  </div>
                  <Link
                    to={`/markets/m/${trade.marketId || "market-1"}`}
                    className="font-bold text-white text-xs sm:text-sm hover:text-blue-400 transition-colors"
                  >
                    {trade.market}
                  </Link>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                  <div className="text-left sm:text-right">
                    <span
                      className={cn(
                        "inline-block rounded-lg px-2.5 py-0.5 text-xs font-black uppercase font-mono",
                        trade.side === "YES"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-rose-500/20 text-rose-400 border border-rose-500/30",
                      )}
                    >
                      {trade.side} @ {trade.priceCents}¢
                    </span>
                    <div className="font-mono text-sm font-black text-white mt-0.5">
                      ${trade.sizeUsd.toLocaleString()} USDC
                    </div>
                  </div>

                  <Link
                    to={`/markets/m/${trade.marketId || "market-1"}`}
                    className="rounded-xl bg-blue-600/20 border border-blue-500/30 px-3 py-1.5 text-xs font-bold text-blue-300 hover:bg-blue-600 hover:text-white transition-all"
                  >
                    Trade
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MarketsAppShell>
  );
}

export default WalletProfilePage;
