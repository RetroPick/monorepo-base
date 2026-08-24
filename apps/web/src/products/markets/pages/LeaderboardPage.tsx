import { useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Sparkles,
  Zap,
  Crown,
  Trophy,
  Search,
  Copy,
  Check,
  UserPlus,
  ArrowUpRight,
} from "lucide-react";
import { MarketsAppShell } from "../components/shell/MarketsAppShell";
import { walletProfilePath } from "../routes/paths";
import { cn } from "@/shared/lib/utils";

interface Trader {
  rank: number;
  wallet: string;
  pnlUsd: number;
  winRatePercent: number;
  totalVolumeUsd: string;
  topMarket: string;
  marketId: string;
}

interface WhaleTrade {
  id: string;
  wallet: string;
  marketTitle: string;
  marketId: string;
  side: "YES" | "NO";
  amountUsd: number;
  priceShares: number;
  timeAgo: string;
}

interface SmartMoneyTrader {
  rank: number;
  wallet: string;
  roi: string;
  winRate: string;
  volumeUsd: string;
  score: number;
}

const TOP_TRADERS: Trader[] = [
  {
    rank: 1,
    wallet: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    pnlUsd: 142500,
    winRatePercent: 88.4,
    totalVolumeUsd: "$1.4M",
    topMarket: "Bitcoin $150K before Jan 2027",
    marketId: "btc-150k-2027",
  },
  {
    rank: 2,
    wallet: "0x1111111254fb6c44bac0bed2854e76f90643097d",
    pnlUsd: 98200,
    winRatePercent: 81.2,
    totalVolumeUsd: "$890K",
    topMarket: "Anthropic IPO in 2026",
    marketId: "anthropic-ipo-2026",
  },
  {
    rank: 3,
    wallet: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    pnlUsd: 74100,
    winRatePercent: 79.6,
    totalVolumeUsd: "$650K",
    topMarket: "Solana $500 in 2026",
    marketId: "solana-500-2026",
  },
  {
    rank: 4,
    wallet: "0x8ba1f109551bD432803012645Ac136ddd64DBA72",
    pnlUsd: 53800,
    winRatePercent: 76.0,
    totalVolumeUsd: "$420K",
    topMarket: "T1 vs Gen.G LCK Final",
    marketId: "t1-vs-geng",
  },
  {
    rank: 5,
    wallet: "0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE",
    pnlUsd: 41200,
    winRatePercent: 73.5,
    totalVolumeUsd: "$380K",
    topMarket: "Fed Rate Cut Q3",
    marketId: "fed-decision-september",
  },
  {
    rank: 6,
    wallet: "0x28C6c06298d514Db089934071355E5743bf21d60",
    pnlUsd: 36900,
    winRatePercent: 71.0,
    totalVolumeUsd: "$310K",
    topMarket: "US Balance of Power 2026",
    marketId: "balance-of-power",
  },
  {
    rank: 7,
    wallet: "0x54BE499092d6e326b4859a16D34C9696b99734a1",
    pnlUsd: 29400,
    winRatePercent: 68.8,
    totalVolumeUsd: "$260K",
    topMarket: "OpenAI GPT-6 Release",
    marketId: "openai-gpt6",
  },
  {
    rank: 8,
    wallet: "0x9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f",
    pnlUsd: 24800,
    winRatePercent: 66.5,
    totalVolumeUsd: "$210K",
    topMarket: "Ethereum ETF Net Inflows",
    marketId: "eth-etf-inflows",
  },
];

const WHALE_TRADES: WhaleTrade[] = [
  {
    id: "wt-1",
    wallet: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    marketTitle: "Will Bitcoin hit $150,000 before January 1, 2027?",
    marketId: "btc-150k-2027",
    side: "YES",
    amountUsd: 125000,
    priceShares: 66,
    timeAgo: "2m ago",
  },
  {
    id: "wt-2",
    wallet: "0x1111111254fb6c44bac0bed2854e76f90643097d",
    marketTitle: "Fed Decision in September: No change or rate cut?",
    marketId: "fed-decision-september",
    side: "YES",
    amountUsd: 84000,
    priceShares: 71,
    timeAgo: "7m ago",
  },
  {
    id: "wt-3",
    wallet: "0x8ba1f109551bD432803012645Ac136ddd64DBA72",
    marketTitle: "Anthropic IPO by December 31, 2026?",
    marketId: "anthropic-ipo-2026",
    side: "YES",
    amountUsd: 65000,
    priceShares: 58,
    timeAgo: "18m ago",
  },
  {
    id: "wt-4",
    wallet: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    marketTitle: "SpaceX Starship Booster Mechazilla Catch Success?",
    marketId: "spacex-mechazilla-catch",
    side: "YES",
    amountUsd: 48500,
    priceShares: 82,
    timeAgo: "35m ago",
  },
  {
    id: "wt-5",
    wallet: "0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE",
    marketTitle: "Strait of Hormuz traffic returns to normal by September 30?",
    marketId: "strait-of-hormuz",
    side: "NO",
    amountUsd: 32000,
    priceShares: 91,
    timeAgo: "1h ago",
  },
  {
    id: "wt-6",
    wallet: "0x28C6c06298d514Db089934071355E5743bf21d60",
    marketTitle: "Will Solana hit $500 in 2026?",
    marketId: "solana-500-2026",
    side: "YES",
    amountUsd: 28000,
    priceShares: 44,
    timeAgo: "2h ago",
  },
];

const SMART_MONEY: SmartMoneyTrader[] = [
  {
    rank: 1,
    wallet: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    roi: "+148%",
    winRate: "88.4%",
    volumeUsd: "$1.4M",
    score: 98,
  },
  {
    rank: 2,
    wallet: "0x1111111254fb6c44bac0bed2854e76f90643097d",
    roi: "+112%",
    winRate: "81.2%",
    volumeUsd: "$890K",
    score: 94,
  },
  {
    rank: 3,
    wallet: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    roi: "+94%",
    winRate: "79.6%",
    volumeUsd: "$650K",
    score: 91,
  },
  {
    rank: 4,
    wallet: "0x8ba1f109551bD432803012645Ac136ddd64DBA72",
    roi: "+83%",
    winRate: "76.0%",
    volumeUsd: "$420K",
    score: 87,
  },
  {
    rank: 5,
    wallet: "0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE",
    roi: "+71%",
    winRate: "73.5%",
    volumeUsd: "$380K",
    score: 84,
  },
  {
    rank: 6,
    wallet: "0x28C6c06298d514Db089934071355E5743bf21d60",
    roi: "+65%",
    winRate: "71.0%",
    volumeUsd: "$310K",
    score: 80,
  },
];

function shortWallet(wallet: string): string {
  if (wallet.length <= 12) return wallet;
  return `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;
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

export function LeaderboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab");
  const activeTab =
    rawTab === "whales"
      ? "whales"
      : rawTab === "smart_money"
      ? "smart_money"
      : "traders";

  const [timeframe, setTimeframe] = useState<"24h" | "7d" | "30d" | "all">("7d");
  const [searchQuery, setSearchQuery] = useState("");
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

  const handleTabChange = (tab: "traders" | "whales" | "smart_money") => {
    setSearchParams({ tab });
  };

  const filteredTraders = useMemo(() => {
    if (!searchQuery.trim()) return TOP_TRADERS;
    const q = searchQuery.trim().toLowerCase();
    return TOP_TRADERS.filter(
      (t) =>
        t.wallet.toLowerCase().includes(q) ||
        t.topMarket.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  const filteredWhales = useMemo(() => {
    if (!searchQuery.trim()) return WHALE_TRADES;
    const q = searchQuery.trim().toLowerCase();
    return WHALE_TRADES.filter(
      (w) =>
        w.wallet.toLowerCase().includes(q) ||
        w.marketTitle.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  const filteredSmartMoney = useMemo(() => {
    if (!searchQuery.trim()) return SMART_MONEY;
    const q = searchQuery.trim().toLowerCase();
    return SMART_MONEY.filter((s) => s.wallet.toLowerCase().includes(q));
  }, [searchQuery]);

  return (
    <MarketsAppShell title="Intelligence - RetroPick">
      <div className="mx-auto max-w-5xl space-y-4">
        {/* Top Control Bar: Search Wallet + Tabs + Timeframe (No bottom divider line) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
          {/* Left: Search Wallet Input Box */}
          <div className="relative w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search wallet address (0x...)"
              className="h-10 w-full rounded-xl border border-white/10 bg-[#0E1424] py-2 pl-10 pr-4 font-mono text-xs text-white placeholder:text-slate-500 outline-none transition-all focus:border-blue-500 focus:bg-[#131B2E]"
            />
          </div>

          {/* Right: Simple Minimalist Tab Switcher */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleTabChange("traders")}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer",
                activeTab === "traders"
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5",
              )}
            >
              <Trophy className={cn("h-4 w-4", activeTab === "traders" ? "text-amber-400" : "text-slate-500")} />
              <span>Top Traders</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("whales")}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer",
                activeTab === "whales"
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5",
              )}
            >
              <Zap className={cn("h-4 w-4", activeTab === "whales" ? "text-cyan-400" : "text-slate-500")} />
              <span>Whales</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("smart_money")}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer",
                activeTab === "smart_money"
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5",
              )}
            >
              <Crown className={cn("h-4 w-4", activeTab === "smart_money" ? "text-amber-300" : "text-slate-500")} />
              <span>Smart Money</span>
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* TAB 1: TOP TRADERS                                           */}
        {/* ============================================================ */}
        {activeTab === "traders" && (
          <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0E1424]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/[0.08] bg-white/[0.02] text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-3 w-14">Rank</th>
                    <th className="px-4 py-3">Wallet</th>
                    <th className="px-4 py-3">PnL</th>
                    <th className="px-4 py-3">Win Rate</th>
                    <th className="px-4 py-3">Volume</th>
                    <th className="px-4 py-3">Top Market</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredTraders.map((trader) => (
                    <tr
                      key={trader.wallet}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-slate-400">
                        #{trader.rank}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <WalletBadge wallet={trader.wallet} />
                          <Link
                            to={walletProfilePath(trader.wallet)}
                            className="font-mono text-xs font-bold text-white hover:text-blue-400 transition-colors"
                            title={trader.wallet}
                          >
                            {shortWallet(trader.wallet)}
                          </Link>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(trader.wallet)}
                            className="text-slate-500 hover:text-slate-300 p-0.5 transition-colors cursor-pointer"
                            title="Copy address"
                          >
                            {copiedWallet === trader.wallet ? (
                              <Check className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-400">
                        +${trader.pnlUsd.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-blue-400">
                        {trader.winRatePercent}%
                      </td>
                      <td className="px-4 py-3 font-mono font-medium text-slate-300">
                        {trader.totalVolumeUsd}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/markets/m/${trader.marketId}`}
                          className="font-medium text-slate-300 hover:text-blue-400 transition-colors truncate max-w-[180px] block"
                        >
                          {trader.topMarket}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => toggleFollow(trader.wallet)}
                          className={cn(
                            "rounded-md px-2.5 py-1 text-xs font-bold transition-all cursor-pointer",
                            following[trader.wallet]
                              ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-white/10 text-white hover:bg-blue-600",
                          )}
                        >
                          {following[trader.wallet] ? "Following" : "Follow"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: WHALE TRACKER                                         */}
        {/* ============================================================ */}
        {activeTab === "whales" && (
          <div className="space-y-2.5">
            {filteredWhales.map((trade) => (
              <div
                key={trade.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#0E1424] p-3.5 transition-all hover:border-blue-500/30"
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                  <WalletBadge wallet={trade.wallet} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        to={walletProfilePath(trade.wallet)}
                        className="font-mono text-xs font-bold text-blue-400 hover:underline"
                      >
                        {shortWallet(trade.wallet)}
                      </Link>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(trade.wallet)}
                        className="text-slate-500 hover:text-slate-300 p-0.5 cursor-pointer"
                        title="Copy wallet"
                      >
                        {copiedWallet === trade.wallet ? (
                          <Check className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                      <span className="text-[11px] text-slate-500 font-mono">
                        · {trade.timeAgo}
                      </span>
                    </div>
                    <Link
                      to={`/markets/m/${trade.marketId}`}
                      className="text-xs font-semibold text-slate-200 hover:text-blue-300 line-clamp-1 mt-0.5 block"
                    >
                      {trade.marketTitle}
                    </Link>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 border-t sm:border-t-0 border-white/5 pt-2 sm:pt-0">
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5 text-xs font-bold font-mono",
                      trade.side === "YES"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-rose-500/20 text-rose-400 border border-rose-500/30",
                    )}
                  >
                    {trade.side} @ {trade.priceShares}¢
                  </span>

                  <div className="text-right">
                    <span className="font-mono text-sm font-black text-white">
                      ${trade.amountUsd.toLocaleString()}
                    </span>
                    <span className="block text-[10px] text-slate-500 uppercase font-bold">
                      USDC
                    </span>
                  </div>

                  <Link
                    to={`/markets/m/${trade.marketId}`}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-600/20 hover:text-white transition-colors"
                    title="View Market"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: SMART MONEY                                           */}
        {/* ============================================================ */}
        {activeTab === "smart_money" && (
          <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0E1424]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/[0.08] bg-white/[0.02] text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-3 w-14">Rank</th>
                    <th className="px-4 py-3">Smart Wallet</th>
                    <th className="px-4 py-3">ROI</th>
                    <th className="px-4 py-3">Win Rate</th>
                    <th className="px-4 py-3">Volume</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredSmartMoney.map((row) => (
                    <tr
                      key={row.wallet}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-slate-400">
                        #{row.rank}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <WalletBadge wallet={row.wallet} />
                          <Link
                            to={walletProfilePath(row.wallet)}
                            className="font-mono text-xs font-bold text-blue-400 hover:underline"
                          >
                            {shortWallet(row.wallet)}
                          </Link>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(row.wallet)}
                            className="text-slate-500 hover:text-slate-300 p-0.5 cursor-pointer"
                            title="Copy wallet"
                          >
                            {copiedWallet === row.wallet ? (
                              <Check className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-400">
                        {row.roi}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-white">
                        {row.winRate}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-300">
                        {row.volumeUsd}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-cyan-400">
                        {row.score}/100
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => toggleFollow(row.wallet)}
                          className={cn(
                            "rounded-md px-2.5 py-1 text-xs font-bold transition-all cursor-pointer",
                            following[row.wallet]
                              ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-white/10 text-white hover:bg-blue-600",
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
        )}
      </div>
    </MarketsAppShell>
  );
}

export default LeaderboardPage;
