"use client";

import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  BarChart2,
  Bookmark,
  HelpCircle,
  ArrowUpRight,
  Compass,
  Trash2,
  PlusCircle,
  Clock,
  ArrowDownToLine,
  TrendingUp,
} from "lucide-react";

import { MarketsAppShell } from "../components/shell/MarketsAppShell";
import { AuthDialog } from "../wallet/components/AuthDialog";
import { DepositModal } from "../components/deposit/DepositModal";
import { PortfolioTradingViewChart } from "../components/portfolio/PortfolioTradingViewChart";
import { useMarketsWalletConnect } from "../wallet/hooks/useMarketsWalletConnect";
import { useUserPortfolio } from "../hooks/useUserPortfolio";
import { discoverPath } from "../routes/paths";
import { cn } from "@/shared/lib/utils";

export function PortfolioPage() {
  const { isConnected, address } = useMarketsWalletConnect();
  const {
    balance,
    positions,
    openOrders,
    closedOrders,
    activities,
    watchlist,
    totalPortfolioValue,
    totalUnrealizedPnl,
    tradeableBalance,
    cancelOrder,
    toggleWatchlist,
  } = useUserPortfolio();

  const [authOpen, setAuthOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [chartTimeframe, setChartTimeframe] = useState<"all" | "30d" | "7d">("7d");
  const [mainTab, setMainTab] = useState<"trades" | "watchlist">("trades");
  const [filterTab, setFilterTab] = useState<"position" | "open" | "closed" | "activity" | "resolution">("position");
  const [hideSmallPositions, setHideSmallPositions] = useState(false);

  // Dynamic Category Distribution based on actual user positions
  const categoryStats = useMemo(() => {
    if (positions.length === 0) {
      return [
        { label: "Crypto", color: "bg-blue-500", percent: "0%" },
        { label: "Economics", color: "bg-amber-500", percent: "0%" },
        { label: "Tech & Science", color: "bg-rose-500", percent: "0%" },
        { label: "Financials", color: "bg-purple-500", percent: "0%" },
      ];
    }
    const totalVal = positions.reduce((acc, p) => acc + p.marketValue, 0) || 1;
    const catMap: Record<string, number> = {};
    positions.forEach((p) => {
      const cat = p.category || "Crypto";
      catMap[cat] = (catMap[cat] || 0) + p.marketValue;
    });

    const colors = ["bg-blue-500", "bg-amber-500", "bg-rose-500", "bg-purple-500", "bg-emerald-500"];
    return Object.entries(catMap).map(([label, val], idx) => ({
      label,
      color: colors[idx % colors.length],
      percent: `${Math.round((val / totalVal) * 100)}%`,
    }));
  }, [positions]);

  const filteredPositions = hideSmallPositions
    ? positions.filter((p) => p.marketValue >= 1000)
    : positions;

  const pnlPercent = totalPortfolioValue > 0
    ? (totalUnrealizedPnl / (totalPortfolioValue - totalUnrealizedPnl || 1)) * 100
    : 0;

  return (
    <MarketsAppShell title="Portfolio - RetroPick">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Top Metrics Dashboard Grid (3-Columns) */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Column 1: Account Overview & Balances (Left) */}
          <div className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#0E1424] p-5 shadow-xl lg:col-span-3">
            <div>
              {/* User Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600/20 text-blue-400 font-bold text-xs border border-blue-500/30 font-mono">
                  {isConnected && address ? (
                    address.slice(2, 4).toUpperCase()
                  ) : (
                    <HelpCircle className="h-4 w-4 text-slate-400" />
                  )}
                </div>
                <div>
                  <span className="font-bold text-white text-sm font-mono block">
                    {isConnected && address
                      ? `${address.slice(0, 6)}…${address.slice(-4)}`
                      : "Demo Account"}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {isConnected ? "Connected Account" : "Testnet Wallet"}
                  </span>
                </div>
              </div>

              {/* Action Button: Deposit USDC */}
              <button
                type="button"
                onClick={() => setDepositOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-600/30 hover:bg-blue-500 active:scale-[0.98] transition-all cursor-pointer mb-5"
              >
                <ArrowDownToLine className="h-4 w-4" />
                <span>Deposit USDC</span>
              </button>

              {/* Overview Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                  <span className="font-bold text-white text-sm">Overview</span>
                  <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-400">
                    USD
                  </span>
                </div>

                <div className="space-y-2 pt-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    BALANCE
                  </div>
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-slate-400">TOTAL VALUE</span>
                    <span className="font-mono font-bold text-white text-sm">
                      ${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-slate-400">UNREALIZED PNL</span>
                    <span
                      className={cn(
                        "font-mono font-bold text-xs",
                        totalUnrealizedPnl >= 0 ? "text-emerald-400" : "text-rose-400",
                      )}
                    >
                      {totalUnrealizedPnl >= 0 ? "+" : ""}${totalUnrealizedPnl.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-slate-400">TRADEABLE BALANCE</span>
                    <span className="font-mono font-black text-emerald-400">
                      ${tradeableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-5 space-y-2 pt-3 border-t border-white/[0.06]">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Active Positions</span>
                <span className="font-mono font-bold text-white">{positions.length}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Open Orders</span>
                <span className="font-mono font-bold text-white">{openOrders.length}</span>
              </div>
            </div>
          </div>

          {/* Column 2: Performance Chart (Center) */}
          <div className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#0E1424] p-5 shadow-xl lg:col-span-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  PORTFOLIO VALUE
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="font-mono text-2xl font-black text-white">
                    ${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span
                    className={cn(
                      "font-mono text-xs font-bold",
                      totalUnrealizedPnl >= 0 ? "text-emerald-400" : "text-rose-400",
                    )}
                  >
                    {totalUnrealizedPnl >= 0 ? "+" : ""}${totalUnrealizedPnl.toFixed(2)} ({pnlPercent >= 0 ? "+" : ""}{pnlPercent.toFixed(2)}%)
                  </span>
                </div>
              </div>

              {/* Timeframe selector */}
              <div className="flex items-center gap-1">
                {(["all", "30d", "7d"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setChartTimeframe(t)}
                    className={cn(
                      "rounded-lg px-3 py-1 text-xs font-bold transition-all cursor-pointer",
                      chartTimeframe === t
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-white/5 text-slate-400 hover:text-white",
                    )}
                  >
                    {t === "all" ? "All" : t.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* TradingView Lightweight Chart Engine */}
            <div className="relative mt-4 w-full">
              <PortfolioTradingViewChart
                timeframe={chartTimeframe}
                currentValue={totalPortfolioValue}
              />
            </div>
          </div>

          {/* Column 3: Category Distribution (Right) */}
          <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0E1424] p-5 shadow-xl lg:col-span-3">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-bold text-white text-sm">
                  Category Distribution
                </h2>
                <span className="text-[10px] text-slate-500 font-mono">Real-time</span>
              </div>

              {/* Donut Chart Graphic */}
              <div className="relative flex items-center justify-center my-4">
                <svg className="h-24 w-24 -rotate-90 transform" viewBox="0 0 36 36">
                  <path
                    className="text-white/5"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {positions.length > 0 && (
                    <circle
                      cx="18"
                      cy="18"
                      r="15.9155"
                      stroke="#3B82F6"
                      strokeWidth="3.5"
                      strokeDasharray="100"
                      strokeDashoffset="0"
                      fill="transparent"
                      strokeLinecap="round"
                    />
                  )}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-300 font-mono">
                  {positions.length > 0 ? "100%" : "0%"}
                </div>
              </div>

              {/* Category Legend List */}
              <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                {categoryStats.map((cat) => (
                  <div
                    key={cat.label}
                    className="flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn("h-2 w-2 rounded-full", cat.color)} />
                      <span className="text-slate-400 font-medium">{cat.label}</span>
                    </div>
                    <span className="text-slate-300 font-mono text-xs font-bold">{cat.percent}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Link */}
            <div className="mt-3 pt-2 border-t border-white/[0.06]">
              <Link
                to={discoverPath()}
                className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
              >
                <span>Browse markets</span>
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* 3. Bottom Section: Positions, Orders & Watchlist Container */}
        <div className="space-y-4 rounded-2xl border border-white/[0.08] bg-[#0E1424] p-5 shadow-xl">
          {/* Primary Tabs: Positions vs Watchlist */}
          <div className="flex items-center gap-6 border-b border-white/[0.06] pb-3">
            <button
              type="button"
              onClick={() => setMainTab("trades")}
              className={cn(
                "flex items-center gap-2 text-sm font-bold transition-all cursor-pointer pb-1",
                mainTab === "trades"
                  ? "text-white font-black border-b-2 border-blue-500"
                  : "text-slate-400 hover:text-slate-200",
              )}
            >
              <BarChart2 className="h-4 w-4 text-blue-400" />
              <span>Positions &amp; Orders ({positions.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setMainTab("watchlist")}
              className={cn(
                "flex items-center gap-2 text-sm font-bold transition-all cursor-pointer pb-1",
                mainTab === "watchlist"
                  ? "text-white font-black border-b-2 border-blue-500"
                  : "text-slate-400 hover:text-slate-200",
              )}
            >
              <Bookmark className="h-4 w-4 text-amber-400" />
              <span>Watchlist ({watchlist.length})</span>
            </button>
          </div>

          {/* If mainTab === 'trades' */}
          {mainTab === "trades" && (
            <>
              {/* Secondary Filter Sub-bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {(
                    ["position", "open", "closed", "activity", "resolution"] as const
                  ).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setFilterTab(tab)}
                      className={cn(
                        "rounded-xl px-3.5 py-1.5 text-xs font-bold capitalize transition-all cursor-pointer shrink-0",
                        filterTab === tab
                          ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                          : "bg-white/5 text-slate-400 hover:text-white",
                      )}
                    >
                      {tab === "position"
                        ? `Positions (${positions.length})`
                        : tab === "open"
                        ? `Open Orders (${openOrders.length})`
                        : tab === "closed"
                        ? `Closed Orders (${closedOrders.length})`
                        : tab === "activity"
                        ? `Activity (${activities.length})`
                        : "Resolution"}
                    </button>
                  ))}
                </div>

                {/* Right Controls: Hide small positions toggle */}
                {filterTab === "position" && positions.length > 0 && (
                  <div className="flex items-center gap-4 self-end sm:self-auto">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-400 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={hideSmallPositions}
                        onChange={(e) => setHideSmallPositions(e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 text-blue-600 focus:ring-0 cursor-pointer"
                      />
                      <span>Hide &lt; $1,000</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Positions Tab */}
              {filterTab === "position" && (
                positions.length === 0 ? (
                  <div className="py-16 text-center space-y-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-slate-400 mx-auto border border-white/10">
                      <BarChart2 className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm font-bold text-white">No Open Positions</div>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        You don&apos;t have any active prediction positions yet. Explore live markets and place your first trade.
                      </p>
                    </div>
                    <div>
                      <Link
                        to={discoverPath()}
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-blue-600/30 hover:bg-blue-500 transition-all"
                      >
                        <Compass className="h-4 w-4" />
                        <span>Explore Markets</span>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto pt-2">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-white/[0.06] text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Market</th>
                          <th className="px-4 py-3">Outcome</th>
                          <th className="px-4 py-3">Shares</th>
                          <th className="px-4 py-3">Avg Cost</th>
                          <th className="px-4 py-3">Last Price</th>
                          <th className="px-4 py-3">Market Value</th>
                          <th className="px-4 py-3 text-right">Unrealized PnL</th>
                          <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {filteredPositions.map((pos) => (
                          <tr key={pos.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-4 py-3 max-w-[280px]">
                              <Link
                                to={`/markets/m/${pos.marketId}`}
                                className="font-bold text-white hover:text-blue-400 transition-colors block truncate"
                              >
                                {pos.title}
                              </Link>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {pos.category} · Res: {pos.resolutionDate}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={cn(
                                  "rounded-md px-2 py-0.5 text-[11px] font-bold font-mono",
                                  pos.outcome === "YES"
                                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                    : "bg-rose-500/20 text-rose-400 border border-rose-500/30",
                                )}
                              >
                                {pos.outcome}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono font-medium text-slate-200">
                              {pos.shares.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 font-mono text-slate-400">
                              ${pos.avgCost.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 font-mono font-bold text-white">
                              ${pos.lastPrice.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 font-mono font-bold text-white">
                              ${pos.marketValue.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">
                              +${pos.unrealizedPnl.toFixed(2)} (+{pos.pnlPercent.toFixed(1)}%)
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Link
                                to={`/markets/m/${pos.marketId}`}
                                className="rounded-lg bg-blue-600/20 border border-blue-500/30 px-3 py-1 text-xs font-bold text-blue-300 hover:bg-blue-600 hover:text-white transition-all inline-block"
                              >
                                Trade / Sell
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}

              {/* Open Orders Tab */}
              {filterTab === "open" && (
                openOrders.length === 0 ? (
                  <div className="py-16 text-center space-y-2">
                    <div className="text-sm font-bold text-white">No Open Orders</div>
                    <p className="text-xs text-slate-400">You do not have any pending limit orders.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto pt-2">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-white/[0.06] text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Market</th>
                          <th className="px-4 py-3">Order Type</th>
                          <th className="px-4 py-3">Outcome</th>
                          <th className="px-4 py-3">Shares</th>
                          <th className="px-4 py-3">Limit Price</th>
                          <th className="px-4 py-3">Total Value</th>
                          <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {openOrders.map((ord) => (
                          <tr key={ord.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-4 py-3 font-bold text-white max-w-[280px]">
                              <Link to={`/markets/m/${ord.marketId}`} className="hover:text-blue-400 block truncate">
                                {ord.title}
                              </Link>
                              <span className="text-[10px] text-slate-500 font-mono">Placed {ord.placedAt}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-mono text-xs font-bold text-amber-400">{ord.type}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="rounded-md bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-bold text-emerald-400">
                                {ord.outcome}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono text-slate-200">{ord.shares.toLocaleString()}</td>
                            <td className="px-4 py-3 font-mono font-bold text-white">${ord.price.toFixed(2)}</td>
                            <td className="px-4 py-3 font-mono font-bold text-white">${ord.totalValue.toFixed(2)}</td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => cancelOrder(ord.id)}
                                className="rounded-lg bg-rose-600/20 border border-rose-500/30 px-2.5 py-1 text-xs font-bold text-rose-300 hover:bg-rose-600 hover:text-white transition-all cursor-pointer"
                              >
                                Cancel
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}

              {/* Closed Orders Tab */}
              {filterTab === "closed" && (
                closedOrders.length === 0 ? (
                  <div className="py-16 text-center space-y-2">
                    <div className="text-sm font-bold text-white">No Closed Orders</div>
                    <p className="text-xs text-slate-400">No settled trade history found.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto pt-2">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-white/[0.06] text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Market</th>
                          <th className="px-4 py-3">Outcome</th>
                          <th className="px-4 py-3">Shares</th>
                          <th className="px-4 py-3">Settled Price</th>
                          <th className="px-4 py-3 text-right">Realized Profit</th>
                          <th className="px-4 py-3 text-right">Settled Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {closedOrders.map((cl) => (
                          <tr key={cl.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-4 py-3 font-bold text-white max-w-[280px]">
                              <Link to={`/markets/m/${cl.marketId}`} className="hover:text-blue-400 block truncate">
                                {cl.title}
                              </Link>
                            </td>
                            <td className="px-4 py-3">
                              <span className="rounded-md bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-bold text-emerald-400">
                                {cl.outcome}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono text-slate-200">{cl.shares.toLocaleString()}</td>
                            <td className="px-4 py-3 font-mono font-bold text-white">${cl.settledPrice.toFixed(2)}</td>
                            <td
                              className={cn(
                                "px-4 py-3 text-right font-mono font-bold",
                                cl.realizedPnl >= 0 ? "text-emerald-400" : "text-rose-400",
                              )}
                            >
                              {cl.realizedPnl >= 0 ? "+" : ""}${cl.realizedPnl.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-slate-400">{cl.settledAt}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}

              {/* Activity Tab */}
              {filterTab === "activity" && (
                activities.length === 0 ? (
                  <div className="py-16 text-center space-y-2">
                    <div className="text-sm font-bold text-white">No Recent Activity</div>
                    <p className="text-xs text-slate-400">Your deposits, trades, and payouts will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 pt-2">
                    {activities.map((act) => (
                      <div
                        key={act.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 hover:bg-white/[0.04] transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "flex h-8 w-8 items-center justify-center rounded-lg font-bold text-xs",
                              act.type === "BUY"
                                ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30"
                                : act.type === "CLAIM"
                                ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                                : act.type === "SELL"
                                ? "bg-amber-600/20 text-amber-400 border border-amber-500/30"
                                : "bg-purple-600/20 text-purple-400 border border-purple-500/30",
                            )}
                          >
                            {act.type === "BUY" ? "B" : act.type === "CLAIM" ? "C" : act.type === "SELL" ? "S" : "D"}
                          </div>
                          <div>
                            <div className="font-bold text-white text-xs">{act.marketTitle}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Tx: {act.txHash} · {act.timeAgo}
                            </div>
                          </div>
                        </div>
                        <div className="font-mono text-xs font-bold text-white">
                          ${act.amountUsd.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {/* Resolution Tab */}
              {filterTab === "resolution" && (
                <div className="py-16 text-center space-y-2">
                  <div className="text-sm font-bold text-white">No Resolutions Pending</div>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    When markets you hold positions in resolve, payouts are automatically credited directly to your USDC balance.
                  </p>
                </div>
              )}
            </>
          )}

          {/* If mainTab === 'watchlist' */}
          {mainTab === "watchlist" && (
            watchlist.length === 0 ? (
              <div className="py-16 text-center space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-amber-400 mx-auto border border-white/10">
                  <Bookmark className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-bold text-white">Your Watchlist is Empty</div>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Bookmark prediction markets that you want to track to quickly access them here.
                  </p>
                </div>
                <div>
                  <Link
                    to={discoverPath()}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-blue-600/30 hover:bg-blue-500 transition-all"
                  >
                    <Compass className="h-4 w-4" />
                    <span>Explore Markets</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
                {watchlist.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between rounded-xl border border-white/[0.08] bg-[#101726] p-4 transition-all hover:border-blue-500/40 shadow-md group"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5">
                        <span className="font-semibold uppercase tracking-wider text-blue-400">{item.category}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-emerald-400 font-bold">{item.change24h}</span>
                          <button
                            type="button"
                            onClick={() => toggleWatchlist({ marketId: item.marketId, title: item.title })}
                            className="text-slate-500 hover:text-rose-400 transition-colors p-0.5 cursor-pointer"
                            title="Remove from Watchlist"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <Link
                        to={`/markets/m/${item.marketId}`}
                        className="font-bold text-white text-xs hover:text-blue-400 line-clamp-2 leading-snug"
                      >
                        {item.title}
                      </Link>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase font-bold">YES Chance</div>
                        <div className="text-sm font-black text-emerald-400 font-mono">{item.yesChance}%</div>
                      </div>
                      <Link
                        to={`/markets/m/${item.marketId}`}
                        className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-blue-600/30 hover:bg-blue-500 transition-all"
                      >
                        Trade
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* 4. Minimalist Footer */}
        <footer className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/[0.08] pt-6 pb-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-slate-400">Consensus Engine Live</span>
            <span className="font-mono text-slate-500">v1.2.0</span>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <Link to={discoverPath()} className="hover:text-slate-300 transition-colors">
              Markets
            </Link>
            <Link to="/markets/intelligence" className="hover:text-slate-300 transition-colors">
              Intelligence
            </Link>
            <Link to="/markets/portfolio" className="hover:text-slate-300 transition-colors">
              Portfolio
            </Link>
          </div>
        </footer>
      </div>

      {/* Auth Modal */}
      <AuthDialog
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
      />

      {/* Deposit USDC Modal */}
      <DepositModal
        isOpen={depositOpen}
        onClose={() => setDepositOpen(false)}
      />
    </MarketsAppShell>
  );
}

export default PortfolioPage;
