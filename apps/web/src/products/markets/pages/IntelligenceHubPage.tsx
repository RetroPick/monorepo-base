"use client";

import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Crown,
  Search,
  Zap,
  Copy,
  Check,
  ArrowUpRight,
} from "lucide-react";

import { cn } from "@/shared/lib/utils";
import { MarketsAppShell } from "../components/shell/MarketsAppShell";
import {
  FIXTURE_SMART_MONEY,
  FIXTURE_WHALE_FEED,
  WhaleFeedItem,
  SmartMoneyRow,
} from "../intelligence/fixtures/devFixtures";
import { walletProfilePath, marketPath } from "../routes/paths";

function shortWallet(wallet: string): string {
  return wallet.length > 12 ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : wallet;
}

function WalletBadge({ wallet }: { wallet: string }) {
  const hex = wallet.slice(2, 4).toUpperCase() || "0X";
  return (
    <div
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-600/20 border border-blue-500/30 font-mono text-[9px] font-bold text-blue-400"
      aria-hidden="true"
    >
      {hex}
    </div>
  );
}

export function IntelligenceHubPage() {
  const [activeTab, setActiveTab] = useState<"whales" | "smart_money">("whales");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sizeFilter, setSizeFilter] = useState<"all" | "50k" | "100k">("all");
  const [sideFilter, setSideFilter] = useState<"all" | "YES" | "NO">("all");
  const [following, setFollowing] = useState<Record<string, boolean>>({});
  const [copiedWallet, setCopiedWallet] = useState<string | null>(null);

  const toggleFollow = (wallet: string) => {
    setFollowing((prev) => ({ ...prev, [wallet]: !prev[wallet] }));
  };

  const copyToClipboard = (wallet: string) => {
    navigator.clipboard.writeText(wallet);
    setCopiedWallet(wallet);
    setTimeout(() => setCopiedWallet(null), 2000);
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
      (m: SmartMoneyRow) =>
        m.wallet.toLowerCase().includes(q) ||
        (m.ens && m.ens.toLowerCase().includes(q)) ||
        m.specialty.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  return (
    <MarketsAppShell title="Intelligence - RetroPick">
      <div className="mx-auto max-w-5xl space-y-5">
        {/* Simple Clean Header Row: Title + 2-Tab Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4 pt-1">
          <div>
            <div className="flex items-center gap-2.5">
              <Zap className="h-6 w-6 text-amber-400" />
              <h1 className="font-display text-2xl sm:text-3xl font-black text-white">
                Market Intelligence
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Live whale order flow tracking and high-conviction Smart Money directory.
            </p>
          </div>

          {/* 2 Tabs: Whales & Smart Money */}
          <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#0E1424] p-1 text-xs font-bold shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab("whales")}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all cursor-pointer",
                activeTab === "whales"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white",
              )}
            >
              <Zap className={cn("h-4 w-4", activeTab === "whales" ? "text-amber-300" : "text-slate-500")} />
              <span>Whales Feed</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("smart_money")}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all cursor-pointer",
                activeTab === "smart_money"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white",
              )}
            >
              <Crown className={cn("h-4 w-4", activeTab === "smart_money" ? "text-yellow-300" : "text-slate-500")} />
              <span>Smart Money</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Search Input Box */}
            <div className="relative w-full sm:max-w-md">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search wallet, ENS (whale.eth), or market..."
                className="h-10 w-full rounded-xl border border-white/10 bg-[#0E1424] py-2 pl-10 pr-4 text-xs font-semibold text-white placeholder:text-slate-500 outline-none transition-all focus:border-blue-500 focus:bg-[#131B2E]"
              />
            </div>

            {/* Quick Sizing & Direction Filters (Whales mode) */}
            {activeTab === "whales" && (
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
            )}
          </div>

          {/* Category Filter Chips for Whales */}
          {activeTab === "whales" && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
              {[
                { id: "all", label: "All Categories" },
                { id: "crypto", label: "₿ Crypto" },
                { id: "macro", label: "🏛 Macro" },
                { id: "tech", label: "🚀 Tech & AI" },
                { id: "sports", label: "🏆 Sports" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg border text-xs font-semibold whitespace-nowrap transition-all cursor-pointer",
                    selectedCategory === cat.id
                      ? "bg-white/15 border-white/30 text-white font-bold"
                      : "border-white/10 bg-white/[0.02] text-slate-400 hover:text-white hover:bg-white/5",
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* TAB 1: WHALES FEED                                           */}
        {/* ============================================================ */}
        {activeTab === "whales" && (
          <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0E1424] shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/[0.08] bg-white/[0.02] text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Trader / Wallet</th>
                    <th className="px-4 py-3">Prediction Market</th>
                    <th className="px-4 py-3">Outcome Side</th>
                    <th className="px-4 py-3 font-mono">Order Size</th>
                    <th className="px-4 py-3 font-mono">Time</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredWhales.map((trade) => (
                    <tr
                      key={trade.id}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <WalletBadge wallet={trade.wallet} />
                          <div>
                            <Link
                              to={walletProfilePath(trade.wallet)}
                              className="font-mono text-xs font-bold text-white hover:text-blue-400 transition-colors block"
                            >
                              {trade.ens || shortWallet(trade.wallet)}
                            </Link>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(trade.wallet)}
                            className="text-slate-500 hover:text-slate-300 p-0.5 transition-colors cursor-pointer"
                            title="Copy address"
                          >
                            {copiedWallet === trade.wallet ? (
                              <Check className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="px-4 py-3 max-w-sm">
                        <Link
                          to={marketPath(trade.marketId || trade.id)}
                          className="font-semibold text-slate-200 hover:text-blue-300 transition-colors line-clamp-1 block"
                        >
                          {trade.market}
                        </Link>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold font-mono border",
                            trade.side === "YES"
                              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                              : "bg-rose-500/15 border-rose-500/30 text-rose-400",
                          )}
                        >
                          {trade.side} @ {trade.priceCents}¢
                        </span>
                      </td>

                      <td className="px-4 py-3 font-mono font-black text-white text-sm">
                        ${trade.sizeUsd.toLocaleString()}
                        <span className="text-[10px] text-slate-500 font-bold ml-1">USDC</span>
                      </td>

                      <td className="px-4 py-3 font-mono text-slate-400">
                        {trade.timestamp}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => toggleFollow(trade.wallet)}
                            className={cn(
                              "rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer",
                              following[trade.wallet]
                                ? "border border-blue-500/30 bg-blue-500/20 text-blue-300"
                                : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/15 hover:text-white",
                            )}
                          >
                            {following[trade.wallet] ? "Following" : "Follow"}
                          </button>

                          <Link
                            to={marketPath(trade.marketId || trade.id)}
                            className="rounded-lg border border-white/10 bg-white/5 p-1 text-slate-400 hover:text-white hover:bg-white/15 transition-colors"
                            title="View Market"
                          >
                            <ArrowUpRight className="h-4 w-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: SMART MONEY DIRECTORY                                 */}
        {/* ============================================================ */}
        {activeTab === "smart_money" && (
          <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0E1424] shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/[0.08] bg-white/[0.02] text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-3 w-14">Rank</th>
                    <th className="px-4 py-3">Smart Wallet</th>
                    <th className="px-4 py-3">Specialty</th>
                    <th className="px-4 py-3">Win Rate</th>
                    <th className="px-4 py-3">ROI</th>
                    <th className="px-4 py-3 font-mono">Volume</th>
                    <th className="px-4 py-3 font-mono">Profit</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredSmartMoney.map((fund: SmartMoneyRow) => (
                    <tr
                      key={fund.wallet}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-slate-400">
                        <span
                          className={cn(
                            "inline-flex items-center justify-center rounded-md px-1.5 py-0.5 text-xs font-bold font-mono",
                            fund.rank === 1 ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" :
                            fund.rank === 2 ? "bg-slate-300/20 text-slate-200 border border-slate-300/40" :
                            fund.rank === 3 ? "bg-amber-700/20 text-amber-400 border border-amber-700/40" :
                            "text-slate-400"
                          )}
                        >
                          #{fund.rank}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <WalletBadge wallet={fund.wallet} />
                          <div>
                            <Link
                              to={walletProfilePath(fund.wallet)}
                              className="font-mono text-xs font-bold text-white hover:text-blue-400 transition-colors block"
                            >
                              {fund.ens || shortWallet(fund.wallet)}
                            </Link>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(fund.wallet)}
                            className="text-slate-500 hover:text-slate-300 p-0.5 transition-colors cursor-pointer"
                            title="Copy address"
                          >
                            {copiedWallet === fund.wallet ? (
                              <Check className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        <span className="rounded bg-white/5 border border-white/10 px-2 py-0.5 text-[11px] font-medium">
                          {fund.specialty}
                        </span>
                      </td>

                      <td className="px-4 py-3 font-mono font-bold text-blue-400">
                        {fund.winRate}
                      </td>

                      <td className="px-4 py-3 font-mono font-bold text-emerald-400">
                        {fund.roi}
                      </td>

                      <td className="px-4 py-3 font-mono text-slate-300">
                        {fund.volumeUsd}
                      </td>

                      <td className="px-4 py-3 font-mono font-bold text-emerald-400">
                        {fund.profitUsd}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => toggleFollow(fund.wallet)}
                          className={cn(
                            "rounded-lg px-3 py-1 text-xs font-bold transition-all cursor-pointer",
                            following[fund.wallet]
                              ? "border border-blue-500/30 bg-blue-500/20 text-blue-300 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/30"
                              : "border border-white/10 bg-white/5 text-slate-200 hover:bg-white/15 hover:text-white",
                          )}
                        >
                          {following[fund.wallet] ? "Following" : "Follow"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </MarketsAppShell>
  );
}

export default IntelligenceHubPage;
