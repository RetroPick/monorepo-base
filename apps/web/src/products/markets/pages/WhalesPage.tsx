import { useState } from "react";
import { Zap, ShieldAlert, ArrowUpRight, ExternalLink } from "lucide-react";
import { MarketsAppShell } from "../components/shell/MarketsAppShell";

interface WhaleTrade {
  id: string;
  traderName: string;
  traderAvatar: string;
  marketTitle: string;
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
    side: "YES",
    amountUsd: 45000,
    priceShares: 66,
    timeAgo: "2 mins ago",
  },
  {
    id: "wt-2",
    traderName: "SatoshiPredictor",
    traderAvatar: "🥷",
    marketTitle: "Anthropic IPO by __?",
    side: "YES",
    amountUsd: 28500,
    priceShares: 86,
    timeAgo: "14 mins ago",
  },
  {
    id: "wt-3",
    traderName: "MacroTactician",
    traderAvatar: "📊",
    marketTitle: "Strait of Hormuz traffic returns to normal by September 30?",
    side: "NO",
    amountUsd: 18200,
    priceShares: 62,
    timeAgo: "45 mins ago",
  },
  {
    id: "wt-4",
    traderName: "CryptoOracle",
    traderAvatar: "🔮",
    marketTitle: "Will Solana hit $500 in 2026?",
    side: "YES",
    amountUsd: 12400,
    priceShares: 58,
    timeAgo: "1 hour ago",
  },
  {
    id: "wt-5",
    traderName: "EsportsTitan",
    traderAvatar: "🎮",
    marketTitle: "T1 vs Gen.G Esports",
    side: "YES",
    amountUsd: 9500,
    priceShares: 62,
    timeAgo: "3 hours ago",
  },
];

export function WhalesPage() {
  return (
    <MarketsAppShell title="Whale Activity Alert Feed - RetroPick">
      {/* Header Banner */}
      <div className="mb-6 rounded-2xl border border-blue-500/30 bg-[#090D16] p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-black text-white">Whale Activity Tracker</h1>
            <p className="text-xs text-slate-400">
              Live feed of high-volume prediction orders ($5,000+ USDC) executed across markets.
            </p>
          </div>
        </div>
      </div>

      {/* Realtime Feed List */}
      <div className="space-y-3">
        {WHALE_TRADES.map((trade) => (
          <div
            key={trade.id}
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#0E131F] p-4 shadow-lg hover:border-white/20 transition-all"
          >
            <div className="flex items-start gap-3 min-w-0">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-xl">
                {trade.traderAvatar}
              </span>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">{trade.traderName}</span>
                  <span className="text-[10px] font-semibold text-slate-500">{trade.timeAgo}</span>
                </div>
                <p className="line-clamp-1 text-xs font-semibold text-slate-300 mt-0.5">
                  {trade.marketTitle}
                </p>
              </div>
            </div>

            {/* Trade Amount & Outcome Side */}
            <div className="flex items-center gap-4 shrink-0 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-white/5 pt-2 sm:pt-0">
              <div className="text-right">
                <div className="flex items-center gap-1.5 justify-end">
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-black ${
                      trade.side === "YES"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                    }`}
                  >
                    BOUGHT {trade.side} @ {trade.priceShares}¢
                  </span>
                </div>
                <p className="font-mono text-sm font-black text-white mt-1">
                  ${trade.amountUsd.toLocaleString()} USDC
                </p>
              </div>

              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                title="View trade on chain"
              >
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </MarketsAppShell>
  );
}

export default WhalesPage;
