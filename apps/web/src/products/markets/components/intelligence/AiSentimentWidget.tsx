import { useState } from "react";
import { Sparkles, TrendingUp, TrendingDown, Newspaper, ArrowUpRight, Zap } from "lucide-react";

interface AiSentimentWidgetProps {
  probYes?: number;
  marketQuestion?: string;
}

export function AiSentimentWidget({ probYes = 64, marketQuestion = "" }: AiSentimentWidgetProps) {
  const [activeTab, setActiveTab] = useState<"sentiment" | "news">("sentiment");

  const bullishScore = Math.min(96, Math.max(12, probYes + 8));
  const bearishScore = 100 - bullishScore;
  const isBullish = bullishScore >= 50;

  return (
    <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-b from-[#0E1528] to-[#0A0E1A] p-5 shadow-2xl">
      {/* Header Badge */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-md">
            <Sparkles className="h-4.5 w-4.5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-sm">AI Market Sentiment & Intelligence</h3>
              <span className="rounded-full bg-blue-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-blue-300 border border-blue-500/30">
                GPT-4o Signal
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Automated AI probability & news catalyst scanner</p>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-[#070B14] p-1">
          <button
            type="button"
            onClick={() => setActiveTab("sentiment")}
            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
              activeTab === "sentiment"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Sentiment
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("news")}
            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
              activeTab === "news"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Catalysts
          </button>
        </div>
      </div>

      {activeTab === "sentiment" ? (
        <div className="mt-4 space-y-4">
          {/* AI Sentiment Score Bar */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold mb-1.5">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <TrendingUp className="h-3.5 w-3.5" />
                BULLISH SENTIMENT ({bullishScore}%)
              </span>
              <span className="flex items-center gap-1.5 text-rose-400">
                BEARISH ({bearishScore}%)
                <TrendingDown className="h-3.5 w-3.5" />
              </span>
            </div>

            {/* Gauge Progress Bar */}
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800 p-0.5 border border-white/10 flex">
              <div
                className="h-full rounded-l-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                style={{ width: `${bullishScore}%` }}
              />
              <div
                className="h-full rounded-r-full bg-gradient-to-r from-rose-500 to-red-600 transition-all duration-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]"
                style={{ width: `${bearishScore}%` }}
              />
            </div>
          </div>

          {/* AI Summary Insight Box */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">AI Signal Confidence</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {isBullish
                ? "AI sentiment model indicates strong institutional accumulation and positive social momentum. Orderbook liquidity shows strong buy-side support at current levels."
                : "AI sentiment model indicates sell pressure following recent macroeconomic updates. Orderbook liquidity reflects heightened volatility and resistance."}
            </p>
          </div>
        </div>
      ) : (
        /* News Catalysts Feed */
        <div className="mt-4 space-y-2.5">
          <div className="flex items-start justify-between rounded-xl border border-white/10 bg-white/[0.03] p-3 hover:border-white/20 transition-all">
            <div className="flex items-start gap-2.5">
              <Newspaper className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-white">Institutional ETF Inflow Spike</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">High volume net accumulation detected across top liquidity pools.</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 shrink-0">
              + Bullish
            </span>
          </div>

          <div className="flex items-start justify-between rounded-xl border border-white/10 bg-white/[0.03] p-3 hover:border-white/20 transition-all">
            <div className="flex items-start gap-2.5">
              <Newspaper className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-white">Fed Interest Rate Decision Approaching</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Options market pricing in 85% probability of 25bps cut.</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-slate-300 bg-white/10 px-2 py-0.5 rounded border border-white/10 shrink-0">
              Neutral
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
