import { useState, useEffect, useMemo } from "react";
import { cn } from "@/shared/lib/utils";
import { ChevronDown, BarChart2, TrendingUp } from "lucide-react";

interface FastCryptoLiveTickerProps {
  marketId?: string;
  marketTitle?: string;
  assetSymbol?: string;
  basePrice?: number;
  initialTargetPrice?: number;
  isUp?: boolean;
}

export function FastCryptoLiveTicker({
  marketId = "btc-up-down-5m",
  marketTitle = "BTC Up or Down 5m",
  assetSymbol = "BTC",
  basePrice = 64782.73,
  initialTargetPrice,
  isUp = false,
}: FastCryptoLiveTickerProps) {
  // Coin Symbol Icon
  const coinIcon =
    assetSymbol === "ETH"
      ? "Ξ"
      : assetSymbol === "SOL"
        ? "◎"
        : assetSymbol === "XRP"
          ? "✕"
          : assetSymbol === "DOGE"
            ? "Ð"
            : "₿";

  const targetPrice = initialTargetPrice ?? basePrice - basePrice * 0.0004;

  // Live Price State initialized dynamically based on asset basePrice
  const [currentPrice, setCurrentPrice] = useState(
    Math.round((basePrice - basePrice * 0.00038) * 100) / 100,
  );
  const [priceToBeat] = useState(basePrice);
  const [activeTimePill, setActiveTimePill] = useState("1:35 PM");
  const [chartMode, setChartMode] = useState<"line" | "coin" | "candle">("line");

  // Countdown Timer: 00 MINS 11 SECS
  const [secondsRemaining, setSecondsRemaining] = useState(74);

  // Historical streaming chart points (18 data points dynamically around basePrice)
  const [points, setPoints] = useState<number[]>(() => {
    const arr: number[] = [];
    const count = 18;
    for (let i = 0; i < count; i++) {
      const wave = Math.sin(i * 0.45) * (basePrice * 0.00025);
      const delta = (i % 3 === 0 ? 1 : -1) * (basePrice * 0.0001);
      const p = Math.round((basePrice + wave + delta - basePrice * 0.0003) * 100) / 100;
      arr.push(p);
    }
    return arr;
  });

  // Ticking Countdown & Live Random Micro-tick matching asset scale
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 300));

      setCurrentPrice((prev) => {
        const volatility = basePrice * 0.00008;
        const delta = (Math.random() - 0.52) * volatility;
        const next = Math.round((prev + delta) * 100) / 100;
        setPoints((pts) => [...pts.slice(1), next]);
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [basePrice]);

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedMinutes = String(minutes).padStart(2, "0");
  const formattedSeconds = String(seconds).padStart(2, "0");

  const diff = currentPrice - priceToBeat;
  const isWinning = diff >= 0;

  // Dynamic Auto-Scaling Bounds
  const width = 640;
  const height = 180;

  const minPoint = Math.min(...points, currentPrice, targetPrice, priceToBeat);
  const maxPoint = Math.max(...points, currentPrice, targetPrice, priceToBeat);
  const rangePadding = Math.max((maxPoint - minPoint) * 0.3, basePrice * 0.0002);

  const minPrice = minPoint - rangePadding;
  const maxPrice = maxPoint + rangePadding;
  const priceRange = Math.max(0.0001, maxPrice - minPrice);

  // Calculate dynamic 6 Y-axis grid levels
  const yLevels = useMemo(() => {
    const step = (maxPrice - minPrice) / 5;
    return [
      maxPrice,
      maxPrice - step,
      maxPrice - step * 2,
      maxPrice - step * 3,
      maxPrice - step * 4,
      minPrice,
    ];
  }, [minPrice, maxPrice]);

  // Calculate SVG polyline points
  const polylinePoints = useMemo(() => {
    if (points.length === 0) return "";
    return points
      .map((p, i) => {
        const x = (i / (points.length - 1)) * (width - 65) + 10;
        const y = height - ((p - minPrice) / priceRange) * (height - 35) - 15;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [points, minPrice, priceRange]);

  const lastPointX = width - 65 + 10;
  const lastPointY = height - ((currentPrice - minPrice) / priceRange) * (height - 35) - 15;
  const targetLineY = height - ((targetPrice - minPrice) / priceRange) * (height - 35) - 15;

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0E1422] p-5 shadow-xl transition-all">
      {/* Top Header Row: Price To Beat vs Current Price + Countdown Timer */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.06] pb-4">
        {/* Prices */}
        <div className="flex items-center gap-6">
          <div>
            <span className="text-xs font-semibold text-slate-400">Price To Beat</span>
            <div className="text-xl sm:text-2xl font-mono font-extrabold text-white">
              ${priceToBeat.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className="h-8 w-[1px] bg-white/10" />

          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <span className="text-slate-400">Current Price</span>
              <span className={cn("font-mono font-bold text-[11px]", isWinning ? "text-emerald-400" : "text-rose-400")}>
                {isWinning ? `▲ +$${diff.toFixed(2)}` : `▼ -$${Math.abs(diff).toFixed(2)}`}
              </span>
            </div>
            <div className={cn("text-xl sm:text-2xl font-mono font-black", isWinning ? "text-emerald-400" : "text-amber-400")}>
              ${currentPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Live Countdown Timer */}
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3.5 py-1.5 text-center">
          <div className="text-center">
            <div className="font-mono text-xl font-black tracking-wider text-rose-400">
              {formattedMinutes} : {formattedSeconds}
            </div>
            <div className="flex items-center justify-between text-[9px] font-bold tracking-widest text-slate-400 uppercase">
              <span>MINS</span>
              <span>SECS</span>
            </div>
          </div>
        </div>
      </div>

      {/* Target Price Callout Pill */}
      <div className="mt-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500/20 text-[10px] font-bold text-amber-400">
            {coinIcon}
          </span>
          <span className="font-mono text-xs font-bold text-amber-400">
            ${targetPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-slate-500">Live 5-Min Target</span>
        </div>

        <div className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-bold text-slate-300">
          <span>Target</span>
          <span>⌃</span>
        </div>
      </div>

      {/* Interactive Live Streaming SVG Chart */}
      <div className="relative mt-2 h-[180px] w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full overflow-visible">
          {/* Target Dashed Horizontal Line */}
          <line
            x1="10"
            y1={targetLineY}
            x2={width - 55}
            y2={targetLineY}
            stroke="#F59E0B"
            strokeWidth="1.2"
            strokeDasharray="4 4"
            className="opacity-70"
          />

          {/* Dynamic Background Grid Lines & Y Axis Labels */}
          {yLevels.map((pLevel, idx) => {
            const y = height - ((pLevel - minPrice) / priceRange) * (height - 35) - 15;
            return (
              <g key={idx}>
                <line
                  x1="10"
                  y1={y}
                  x2={width - 55}
                  y2={y}
                  stroke="#1E293B"
                  strokeWidth="0.8"
                  strokeDasharray="3 3"
                />
                <text
                  x={width - 50}
                  y={y + 3}
                  fill="#64748B"
                  fontSize="9"
                  fontFamily="monospace"
                  textAnchor="start"
                >
                  ${pLevel.toLocaleString("en-US", { minimumFractionDigits: pLevel < 10 ? 2 : 0, maximumFractionDigits: 2 })}
                </text>
              </g>
            );
          })}

          {/* Streaming Live Price Curve */}
          <polyline
            fill="none"
            stroke="#F59E0B"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={polylinePoints}
          />

          {/* Current Animated Pulse Point */}
          <circle cx={lastPointX} cy={lastPointY} r="4" fill="#F59E0B" className="animate-pulse" />
          <circle cx={lastPointX} cy={lastPointY} r="8" fill="#F59E0B" opacity="0.3" className="animate-ping" />
        </svg>
      </div>

      {/* X-Axis Timestamps */}
      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 px-2 mt-1">
        <span>12:34:28 AM</span>
        <span>12:34:35 AM</span>
        <span>12:34:42 AM</span>
        <span>12:34:48 AM</span>
      </div>

      {/* Bottom Chart Footer Controls & Time Pills */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-3">
        {/* Time Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
          <button
            type="button"
            className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-slate-400 hover:text-white transition-colors"
          >
            <span>Past</span>
            <ChevronDown className="h-3 w-3" />
          </button>

          {["1:35 PM", "1:40 PM", "1:45 PM", "1:50 PM"].map((pill) => {
            const active = activeTimePill === pill;
            return (
              <button
                key={pill}
                type="button"
                onClick={() => setActiveTimePill(pill)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold transition-all cursor-pointer whitespace-nowrap",
                  active
                    ? "bg-white text-slate-900 font-bold shadow-md"
                    : "text-slate-400 hover:text-white",
                )}
              >
                {active && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                <span>{pill}</span>
              </button>
            );
          })}
        </div>

        {/* View Switcher Icons */}
        <div className="flex items-center gap-1 bg-[#121829] p-0.5 rounded-lg border border-white/10">
          <button
            type="button"
            onClick={() => setChartMode("line")}
            title="Line View"
            className={cn(
              "p-1.5 rounded-md text-xs transition-colors cursor-pointer",
              chartMode === "line" ? "bg-white/10 text-white" : "text-slate-400 hover:text-slate-200",
            )}
          >
            <TrendingUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setChartMode("coin")}
            title="Coin Info"
            className={cn(
              "p-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer",
              chartMode === "coin" ? "bg-white/10 text-amber-400" : "text-slate-400 hover:text-slate-200",
            )}
          >
            {coinIcon}
          </button>
          <button
            type="button"
            onClick={() => setChartMode("candle")}
            title="Candlestick View"
            className={cn(
              "p-1.5 rounded-md text-xs transition-colors cursor-pointer",
              chartMode === "candle" ? "bg-white/10 text-white" : "text-slate-400 hover:text-slate-200",
            )}
          >
            <BarChart2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
