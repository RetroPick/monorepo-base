import { useState } from "react";
import { Trophy, TrendingUp, UserPlus, Check, Award } from "lucide-react";
import { MarketsAppShell } from "../components/shell/MarketsAppShell";

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
    name: "DefiChad_Web3",
    avatar: "⚡",
    pnlUsd: 32900,
    winRatePercent: 71.8,
    totalVolumeUsd: "$290K",
    topMarket: "Strait of Hormuz",
  },
];

export function TradersPage() {
  const [following, setFollowing] = useState<Record<string, boolean>>({});

  const toggleFollow = (traderName: string) => {
    setFollowing((prev) => ({ ...prev, [traderName]: !prev[traderName] }));
  };

  return (
    <MarketsAppShell title="Top Traders Leaderboard - RetroPick">
      {/* Header Banner */}
      <div className="mb-6 rounded-2xl border border-white/10 bg-[#090D16] p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-black text-white">Top Traders Leaderboard</h1>
            <p className="text-xs text-slate-400">
              Track the highest-earning prediction traders, their win rates, and follow their positions.
            </p>
          </div>
        </div>
      </div>

      {/* Top 3 Podium Highlights */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {TOP_TRADERS.slice(0, 3).map((trader) => (
          <div
            key={trader.name}
            className={`relative flex flex-col items-center rounded-2xl border p-5 shadow-xl transition-all ${
              trader.rank === 1
                ? "border-amber-500/40 bg-gradient-to-b from-amber-500/10 to-[#0E131F]"
                : trader.rank === 2
                ? "border-slate-400/40 bg-gradient-to-b from-slate-400/10 to-[#0E131F]"
                : "border-orange-500/40 bg-gradient-to-b from-orange-500/10 to-[#0E131F]"
            }`}
          >
            <div className="absolute -top-3.5 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 border border-white/20 text-xs font-black text-white">
              #{trader.rank}
            </div>

            <div className="mt-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-2xl shadow-md">
              {trader.avatar}
            </div>

            <h3 className="mt-3 font-bold text-white text-base">{trader.name}</h3>
            <span className="text-xs font-semibold text-slate-400">Top Market: {trader.topMarket}</span>

            <div className="mt-4 flex items-center justify-between w-full border-t border-white/10 pt-3 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500">Total Profit</span>
                <p className="font-mono font-black text-emerald-400 text-sm">
                  +${trader.pnlUsd.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-500">Win Rate</span>
                <p className="font-mono font-bold text-white text-sm">{trader.winRatePercent}%</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => toggleFollow(trader.name)}
              className={`mt-4 w-full flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all ${
                following[trader.name]
                  ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-blue-600 text-white hover:bg-blue-500 shadow-md shadow-blue-600/30"
              }`}
            >
              {following[trader.name] ? <Check className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
              <span>{following[trader.name] ? "Following" : "Follow Trades"}</span>
            </button>
          </div>
        ))}
      </div>

      {/* Full Leaderboard Table */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0E131F] shadow-xl">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <span className="font-bold text-white text-sm">Ranked All-Time Traders</span>
          <span className="text-xs font-semibold text-slate-400">Updated Real-Time</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/10 bg-white/[0.02] text-slate-400 font-bold uppercase text-[10px]">
              <tr>
                <th className="px-5 py-3">Rank</th>
                <th className="px-5 py-3">Trader</th>
                <th className="px-5 py-3">Total PnL ($)</th>
                <th className="px-5 py-3">Win Rate</th>
                <th className="px-5 py-3">Volume</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {TOP_TRADERS.map((trader) => (
                <tr key={trader.name} className="hover:bg-white/[0.03] transition-colors">
                  <td className="px-5 py-4 font-mono font-bold text-slate-300">#{trader.rank}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-base">
                        {trader.avatar}
                      </span>
                      <span className="font-bold text-white">{trader.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 font-mono font-bold text-emerald-400">
                    +${trader.pnlUsd.toLocaleString()}
                  </td>
                  <td className="px-5 py-4 font-mono font-bold text-white">{trader.winRatePercent}%</td>
                  <td className="px-5 py-4 font-mono text-slate-300">{trader.totalVolumeUsd}</td>
                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => toggleFollow(trader.name)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                        following[trader.name]
                          ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-blue-600 text-white hover:bg-blue-500"
                      }`}
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
    </MarketsAppShell>
  );
}

export default TradersPage;
