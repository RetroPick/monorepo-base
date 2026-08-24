"use client";

import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/shared/lib/utils";
import { marketPath } from "../../routes/paths";
import { MARKETS } from "../../lib/retropickData";
import { useMarketsEventsInfinite } from "../../hooks/useMarketsQueries";

interface RelatedFastMarketsSidebarProps {
  currentMarketId?: string;
  category?: string;
}

type TabType = "trending" | "high_vol" | "new" | "ending_soon";

export function RelatedFastMarketsSidebar({
  currentMarketId = "",
  category = "Crypto",
}: RelatedFastMarketsSidebarProps) {
  const [selectedTab, setSelectedTab] = useState<TabType>("trending");
  const [liveTicks, setLiveTicks] = useState<Record<string, { yes: number; isUp: boolean; tickTime: number }>>({});

  // Query live events catalog if available
  const eventsQuery = useMarketsEventsInfinite();
  const allLiveEvents: any[] = useMemo(
    () => eventsQuery.data?.pages.flatMap((p) => p.events) ?? [],
    [eventsQuery.data],
  );

  // Compute filtered list based on active tab
  const marketsList = useMemo(() => {
    const pool = MARKETS.filter((m) => m.id !== currentMarketId);

    if (selectedTab === "high_vol") {
      return [...pool].sort((a, b) => {
        const parseVol = (v: string) => {
          const num = parseFloat(v.replace(/[^0-9.]/g, "")) || 0;
          if (v.includes("M")) return num * 1_000_000;
          if (v.includes("K")) return num * 1_000;
          return num;
        };
        return parseVol(b.volume) - parseVol(a.volume);
      }).slice(0, 5);
    }

    if (selectedTab === "new") {
      return [...pool]
        .filter((m) => m.category === category || m.category === "Crypto" || m.category === "AI")
        .reverse()
        .slice(0, 5);
    }

    if (selectedTab === "ending_soon") {
      return [...pool]
        .filter((m) => m.timeLeft.includes("m") || m.timeLeft.includes("h") || m.timeLeft.includes("Today") || m.marketType === "DIRECTION")
        .slice(0, 5);
    }

    // Default: Trending (top diversified real markets)
    return pool.slice(0, 5);
  }, [currentMarketId, selectedTab, category]);

  // Real-time live market updates (simulating live orderbook trades)
  useEffect(() => {
    const interval = setInterval(() => {
      if (marketsList.length === 0) return;
      const targetIdx = Math.floor(Math.random() * marketsList.length);
      const targetMarket = marketsList[targetIdx];
      if (!targetMarket) return;

      const currentYes = liveTicks[targetMarket.id]?.yes ?? targetMarket.yes;
      const delta = (Math.random() > 0.5 ? 1 : -1) * (Math.random() > 0.7 ? 2 : 1);
      const newYes = Math.min(99, Math.max(1, currentYes + delta));

      setLiveTicks((prev) => ({
        ...prev,
        [targetMarket.id]: {
          yes: newYes,
          isUp: delta >= 0,
          tickTime: Date.now(),
        },
      }));
    }, 2800);

    return () => clearInterval(interval);
  }, [marketsList, liveTicks]);

  return (
    <div className="space-y-4">
      {/* Top Status Card */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0E1422] p-5 shadow-xl transition-all">
        <div className="flex items-center justify-between mb-1.5">
          <h4 className="font-bold text-sm text-white">Live Prediction Settlement</h4>
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            LIVE
          </span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed font-normal">
          This market is active and verified. Final outcome resolution will execute trustlessly on-chain upon event completion.
        </p>
      </div>

      {/* Realtime Related Markets Stream (Clean, No divider line) */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0E1422] p-4 shadow-xl transition-all space-y-2.5">
        {/* Tab Switcher Pills without bottom border line */}
        <div className="flex items-center gap-1 text-xs font-semibold overflow-x-auto no-scrollbar pb-1">
          {[
            { id: "trending", label: "Trending" },
            { id: "high_vol", label: "High Vol" },
            { id: "new", label: "New" },
            { id: "ending_soon", label: "Ending Soon" },
          ].map((tab) => {
            const active = selectedTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedTab(tab.id as TabType)}
                className={cn(
                  "rounded-lg px-2.5 py-1 transition-all cursor-pointer whitespace-nowrap",
                  active
                    ? "bg-white/10 text-white font-bold shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-white/5",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Real-time Markets Stream List */}
        <div className="space-y-1">
          {marketsList.map((item) => {
            const liveData = liveTicks[item.id];
            const currentProb = liveData?.yes ?? item.yes;
            const isUp = currentProb >= 50;
            const isRecentlyUpdated = liveData && Date.now() - liveData.tickTime < 1800;

            return (
              <Link
                key={item.id}
                to={marketPath(item.id)}
                className={cn(
                  "group flex items-center justify-between p-2 rounded-xl transition-all border border-transparent hover:bg-white/[0.04]",
                  isRecentlyUpdated ? "bg-white/[0.03]" : "",
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                  <img
                    src={item.image}
                    alt={item.question}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/images/markets/crypto/bitcoin.webp";
                    }}
                    className="h-9 w-9 rounded-xl object-cover shrink-0 bg-[#121929] border border-white/[0.08] shadow-sm"
                  />
                  <span className="text-xs font-bold text-slate-200 group-hover:text-blue-400 transition-colors truncate">
                    {item.question}
                  </span>
                </div>

                <div className="flex flex-col items-end shrink-0 pl-1">
                  <div className="flex items-center gap-1.5">
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
                    <span
                      className={cn(
                        "font-mono text-xs font-extrabold transition-colors",
                        isRecentlyUpdated
                          ? liveData.isUp
                            ? "text-emerald-400 font-black"
                            : "text-rose-400 font-black"
                          : "text-white",
                      )}
                    >
                      {currentProb}%
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

export default RelatedFastMarketsSidebar;
