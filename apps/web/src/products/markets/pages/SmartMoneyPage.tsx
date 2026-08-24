"use client";

import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Crown, ArrowLeft, Search, UserPlus, Check, TrendingUp, Sparkles } from "lucide-react";

import { cn } from "@/shared/lib/utils";
import { MarketsAppShell } from "../components/shell/MarketsAppShell";
import { FIXTURE_SMART_MONEY } from "../intelligence/fixtures/devFixtures";
import { intelligencePath, walletProfilePath } from "../routes/paths";

const RANK_MEDAL: Record<number, { emoji: string; className: string }> = {
  1: { emoji: "🥇", className: "border-amber-400/40 bg-amber-400/10 text-amber-300" },
  2: { emoji: "🥈", className: "border-slate-300/30 bg-slate-300/10 text-slate-200" },
  3: { emoji: "🥉", className: "border-orange-400/40 bg-orange-400/10 text-orange-300" },
};

function shortWallet(wallet: string): string {
  return wallet.length > 12 ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : wallet;
}

export function SmartMoneyPage() {
  const [search, setSearch] = useState("");
  const [following, setFollowing] = useState<Record<string, boolean>>({});

  const toggleFollow = (wallet: string) => {
    setFollowing((prev) => ({ ...prev, [wallet]: !prev[wallet] }));
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return FIXTURE_SMART_MONEY;
    const q = search.trim().toLowerCase();
    return FIXTURE_SMART_MONEY.filter(
      (r) =>
        r.wallet.toLowerCase().includes(q) ||
        (r.ens && r.ens.toLowerCase().includes(q)) ||
        r.specialty.toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <MarketsAppShell title="Smart Money Leaderboard">
      <div className="mx-auto max-w-7xl space-y-6">
        <Link
          to={intelligencePath()}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Intelligence Radar</span>
        </Link>

        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2.5 font-display text-2xl sm:text-3xl font-black text-white">
              <Crown className="h-7 w-7 text-amber-400" />
              <span>Smart Money Leaderboard</span>
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              Institutional funds and top-performing prediction market traders ranked by verified ROI &amp; win rate.
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by ENS, wallet, specialty..."
              className="w-full rounded-2xl border border-white/10 bg-[#0E1424] py-2.5 pl-10 pr-4 text-xs font-semibold text-white placeholder:text-slate-500 outline-none focus:border-blue-500 shadow-inner"
            />
          </div>
        </div>

        {/* Top 20 Table */}
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0E1424] shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/[0.06] bg-white/[0.02] text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-4">Rank</th>
                  <th className="px-5 py-4">Wallet / Fund</th>
                  <th className="px-5 py-4">Primary Specialty</th>
                  <th className="px-5 py-4">ROI (%)</th>
                  <th className="px-5 py-4">Win Rate</th>
                  <th className="px-5 py-4">Total Profit</th>
                  <th className="px-5 py-4">30D Volume</th>
                  <th className="px-5 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.map((row) => {
                  const medal = RANK_MEDAL[row.rank];
                  return (
                    <tr key={row.rank} className="hover:bg-white/[0.03] transition-colors">
                      <td className="px-5 py-4">
                        {medal ? (
                          <span
                            className={cn(
                              "inline-flex items-center justify-center rounded-xl px-2 py-0.5 text-xs font-black border",
                              medal.className,
                            )}
                          >
                            {medal.emoji} #{row.rank}
                          </span>
                        ) : (
                          <span className="font-mono font-bold text-slate-400">#{row.rank}</span>
                        )}
                      </td>

                      <td className="px-5 py-4">
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

                      <td className="px-5 py-4">
                        <span className="rounded-md bg-white/5 border border-white/10 px-2 py-0.5 text-[11px] font-semibold text-slate-300">
                          {row.specialty}
                        </span>
                      </td>

                      <td className="px-5 py-4">
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

                      <td className="px-5 py-4 font-mono font-bold text-white">{row.winRate}</td>
                      <td className="px-5 py-4 font-mono font-bold text-emerald-400">{row.profitUsd}</td>
                      <td className="px-5 py-4 font-mono text-slate-300">{row.volumeUsd}</td>

                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => toggleFollow(row.wallet)}
                          className={cn(
                            "rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer",
                            following[row.wallet]
                              ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-blue-600 text-white hover:bg-blue-500 shadow-md shadow-blue-600/20",
                          )}
                        >
                          {following[row.wallet] ? "Following" : "Follow Trades"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MarketsAppShell>
  );
}

export default SmartMoneyPage;
