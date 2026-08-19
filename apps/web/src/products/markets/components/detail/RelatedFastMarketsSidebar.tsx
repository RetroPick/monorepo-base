import { useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/shared/lib/utils";
import { marketPath } from "../../routes/paths";
import { MARKETS } from "../../lib/retropickData";

interface RelatedFastMarketsSidebarProps {
  currentMarketId?: string;
  category?: string;
}

export function RelatedFastMarketsSidebar({
  currentMarketId = "",
  category = "Crypto",
}: RelatedFastMarketsSidebarProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<"5m" | "15m" | "1h" | "1d">("5m");

  // Get matching markets from same or adjacent category, excluding current
  const relatedList = MARKETS.filter((m) => m.id !== currentMarketId).slice(0, 4);

  return (
    <div className="space-y-4">
      {/* Top Status Card */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0E1422] p-5 shadow-xl transition-all">
        <h4 className="font-bold text-sm text-white">Live Prediction Settlement</h4>
        <p className="mt-1 text-xs text-slate-400 leading-relaxed font-normal">
          This market is active and verified. Final outcome resolution will execute trustlessly on-chain upon event completion.
        </p>
      </div>

      {/* Related Markets Stream */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0E1422] p-4 shadow-xl transition-all space-y-3">
        {/* Timeframe Selector Pills */}
        <div className="flex items-center gap-1.5 border-b border-white/[0.06] pb-3 text-xs font-semibold">
          {[
            { id: "5m", label: "Trending" },
            { id: "15m", label: "High Vol" },
            { id: "1h", label: "New" },
            { id: "1d", label: "Ending Soon" },
          ].map((tf) => {
            const active = selectedTimeframe === tf.id;
            return (
              <button
                key={tf.id}
                type="button"
                onClick={() => setSelectedTimeframe(tf.id as any)}
                className={cn(
                  "rounded-lg px-2.5 py-1 transition-all cursor-pointer",
                  active
                    ? "bg-[#18233C] text-white font-bold shadow-sm"
                    : "text-slate-400 hover:text-white",
                )}
              >
                {tf.label}
              </button>
            );
          })}
        </div>

        {/* Markets Stream List */}
        <div className="space-y-2">
          {relatedList.map((item) => {
            const isUp = item.yes >= 50;
            return (
              <Link
                key={item.id}
                to={marketPath(item.id)}
                className="flex items-center justify-between p-2 rounded-xl transition-all border border-transparent hover:border-white/10 hover:bg-white/[0.03]"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                  <img
                    src={item.image}
                    alt={item.question}
                    className="h-8 w-8 rounded-xl object-contain bg-[#080D18] p-1 border border-white/10 shrink-0"
                  />
                  <span className="text-xs font-bold text-slate-200 truncate">
                    {item.question}
                  </span>
                </div>

                <div className="flex flex-col items-end shrink-0">
                  <div className="flex items-center gap-1">
                    <span className="relative flex h-2 w-2">
                      <span
                        className={cn(
                          "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                          isUp ? "bg-emerald-400" : "bg-rose-400",
                        )}
                      />
                      <span
                        className={cn(
                          "relative inline-flex rounded-full h-2 w-2",
                          isUp ? "bg-emerald-500" : "bg-rose-500",
                        )}
                      />
                    </span>
                    <span className="font-mono text-xs font-extrabold text-white">
                      {item.yes}%
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {item.marketType === "DIRECTION" ? "Up" : "chance"}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
