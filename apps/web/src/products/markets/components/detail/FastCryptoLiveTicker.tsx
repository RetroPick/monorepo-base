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

interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function FastCryptoLiveTicker({
  marketId = "eth-up-down-5m",
  marketTitle = "Ethereum Up or Down – 5 Min",
  assetSymbol = "ETH",
  basePrice = 3480.50,
  initialTargetPrice,
  isUp = false,
}: FastCryptoLiveTickerProps) {
  // Coin Symbol Icon & Color Theme
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

  const targetPrice = initialTargetPrice ?? basePrice - basePrice * 0.00035;

  // Live Price State
  const [currentPrice, setCurrentPrice] = useState(
    () => Math.round((basePrice - basePrice * 0.00045) * 100) / 100,
  );
  const [priceToBeat] = useState(basePrice);
  const [activeTimePill, setActiveTimePill] = useState("1:35 PM");
  const [chartMode, setChartMode] = useState<"line" | "coin" | "candle">("line");

  // Hover state for interactive tooltip
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Countdown Timer: 00 MINS 59 SECS
  const [secondsRemaining, setSecondsRemaining] = useState(59);

  // Historical streaming chart points (24 data points dynamically curving around basePrice)
  const [points, setPoints] = useState<number[]>(() => {
    const arr: number[] = [];
    const count = 24;
    for (let i = 0; i < count; i++) {
      const wave = Math.sin(i * 0.38) * (basePrice * 0.0006);
      const delta = (i % 4 === 0 ? 1 : -0.8) * (basePrice * 0.00035);
      const p = Math.round((basePrice - basePrice * 0.0004 + wave + delta) * 100) / 100;
      arr.push(p);
    }
    return arr;
  });

  // Candlestick data points for Candle mode
  const [candles, setCandles] = useState<CandleData[]>(() => {
    const list: CandleData[] = [];
    const candleCount = 12;
    let prevClose = basePrice - basePrice * 0.0005;
    for (let i = 0; i < candleCount; i++) {
      const open = prevClose;
      const change = (Math.sin(i * 0.6) * 0.7 + (Math.random() - 0.48) * 0.6) * (basePrice * 0.0005);
      const close = Math.round((open + change) * 100) / 100;
      const high = Math.round((Math.max(open, close) + Math.random() * (basePrice * 0.0003)) * 100) / 100;
      const low = Math.round((Math.min(open, close) - Math.random() * (basePrice * 0.0003)) * 100) / 100;
      const volume = Math.round(15 + Math.random() * 45);
      list.push({
        time: `${i * 25}s`,
        open,
        high,
        low,
        close,
        volume,
      });
      prevClose = close;
    }
    return list;
  });

  // Ticking Countdown & Live Realistic Micro-tick simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 300));

      setCurrentPrice((prev) => {
        const volatility = basePrice * 0.00012;
        const delta = (Math.random() - 0.49) * volatility;
        const next = Math.round((prev + delta) * 100) / 100;

        setPoints((pts) => [...pts.slice(1), next]);

        // Update latest candle
        setCandles((prevCandles) => {
          if (prevCandles.length === 0) return prevCandles;
          const lastIdx = prevCandles.length - 1;
          const lastCandle = prevCandles[lastIdx];
          const updatedLast: CandleData = {
            ...lastCandle,
            close: next,
            high: Math.max(lastCandle.high, next),
            low: Math.min(lastCandle.low, next),
            volume: lastCandle.volume + 1,
          };
          return [...prevCandles.slice(0, lastIdx), updatedLast];
        });

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

  // Primary Theme Colors based on win/loss against Price To Beat
  const strokeColor = isWinning ? "#10B981" : "#F59E0B"; // Emerald vs Neon Amber
  const gradientStart = isWinning ? "rgba(16, 185, 129, 0.35)" : "rgba(245, 158, 11, 0.32)";
  const gradientStop = isWinning ? "rgba(16, 185, 129, 0.00)" : "rgba(245, 158, 11, 0.00)";

  // Dynamic Chart Coordinate Dimensions
  const width = 640;
  const height = 190;
  const chartTop = 15;
  const chartBottom = 165;
  const chartHeight = chartBottom - chartTop;
  const chartLeft = 10;
  const chartRight = width - 65;
  const chartWidth = chartRight - chartLeft;

  // Auto-scaled dynamic price bounds with balanced padding
  const allValues = useMemo(() => [...points, currentPrice, targetPrice, priceToBeat], [points, currentPrice, targetPrice, priceToBeat]);
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const span = Math.max(maxVal - minVal, basePrice * 0.0008);
  const padding = span * 0.18;

  const minPrice = minVal - padding;
  const maxPrice = maxVal + padding;
  const priceRange = Math.max(0.0001, maxPrice - minPrice);

  // Convert (index, price) to SVG coordinate (x, y)
  const coords = useMemo(() => {
    return points.map((p, i) => {
      const x = chartLeft + (i / (points.length - 1)) * chartWidth;
      const y = chartBottom - ((p - minPrice) / priceRange) * chartHeight;
      return { x, y, price: p };
    });
  }, [points, minPrice, priceRange, chartLeft, chartWidth, chartBottom, chartHeight]);

  // Generate Smooth Cubic Spline Path + Gradient Area Path
  const { splinePath, areaPath } = useMemo(() => {
    if (coords.length === 0) return { splinePath: "", areaPath: "" };
    if (coords.length === 1) {
      return { splinePath: `M ${coords[0].x},${coords[0].y}`, areaPath: "" };
    }

    let d = `M ${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i === 0 ? i : i - 1];
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const p3 = coords[i + 2] ?? p2;

      const cp1x = p1.x + (p2.x - p0.x) / 5.5;
      const cp1y = p1.y + (p2.y - p0.y) / 5.5;
      const cp2x = p2.x - (p3.x - p1.x) / 5.5;
      const cp2y = p2.y - (p3.y - p1.y) / 5.5;

      d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }

    const last = coords[coords.length - 1];
    const first = coords[0];
    const area = `${d} L ${last.x.toFixed(1)},${chartBottom + 10} L ${first.x.toFixed(1)},${chartBottom + 10} Z`;

    return { splinePath: d, areaPath: area };
  }, [coords, chartBottom]);

  // Y positions for baseline lines
  const lastPoint = coords[coords.length - 1] ?? { x: chartRight, y: chartBottom / 2, price: currentPrice };
  const targetLineY = chartBottom - ((targetPrice - minPrice) / priceRange) * chartHeight;
  const priceToBeatY = chartBottom - ((priceToBeat - minPrice) / priceRange) * chartHeight;

  // 5 Dynamic Y-axis price labels
  const yLevels = useMemo(() => {
    const step = (maxPrice - minPrice) / 4;
    return [maxPrice, maxPrice - step, maxPrice - step * 2, maxPrice - step * 3, minPrice];
  }, [minPrice, maxPrice]);

  // Rolling dynamic timestamps for X-axis
  const timestamps = useMemo(() => {
    const now = new Date();
    const result: string[] = [];
    for (let i = 3; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 15000);
      result.push(d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" }));
    }
    return result;
  }, [secondsRemaining]);

  const activeHover = hoverIndex !== null && coords[hoverIndex] ? coords[hoverIndex] : null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0B0F19] p-5 shadow-2xl transition-all">
      {/* Background Subtle Gradient Glow */}
      <div
        className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full blur-[100px] opacity-15"
        style={{ backgroundColor: strokeColor }}
      />

      {/* Top Header Row: Price To Beat vs Current Price + Countdown Timer */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.06] pb-4">
        {/* Price To Beat & Current Price Display */}
        <div className="flex items-center gap-5 sm:gap-8">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Price To Beat</span>
            <div className="text-xl sm:text-2xl font-mono font-black text-white tracking-tight">
              ${priceToBeat.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className="h-9 w-[1px] bg-white/10" />

          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider">
              <span className="text-slate-400">Current Price</span>
              <span className={cn("font-mono font-bold text-xs", isWinning ? "text-emerald-400" : "text-rose-400")}>
                {isWinning ? `▲ +$${diff.toFixed(2)}` : `▼ -$${Math.abs(diff).toFixed(2)}`}
              </span>
            </div>
            <div className={cn("text-xl sm:text-2xl font-mono font-black tracking-tight", isWinning ? "text-emerald-400" : "text-amber-400")}>
              ${currentPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Live Countdown Clock Badge */}
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-1.5 shadow-inner">
          <div className="text-center">
            <div className="font-mono text-xl sm:text-2xl font-black tracking-wider text-rose-400 leading-none">
              {formattedMinutes} : {formattedSeconds}
            </div>
            <div className="flex items-center justify-between text-[8px] font-bold tracking-widest text-slate-400 uppercase mt-0.5">
              <span>MINS</span>
              <span>SECS</span>
            </div>
          </div>
        </div>
      </div>

      {/* Target Price Callout Pill Bar */}
      <div className="mt-3.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-xs font-bold text-amber-400 border border-amber-500/30">
            {coinIcon}
          </span>
          <span className="font-mono text-xs font-bold text-amber-400">
            ${targetPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[11px] font-medium text-slate-400">Live 5-Min Target</span>
        </div>

        <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-bold text-slate-300 shadow-sm">
          <span>Target</span>
          <span className="text-amber-400 font-bold">▲</span>
        </div>
      </div>

      {/* MAIN CHART CONTAINER */}
      <div className="relative mt-2.5 h-[195px] w-full select-none">
        {chartMode === "line" && (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-full w-full overflow-visible"
            onMouseLeave={() => setHoverIndex(null)}
          >
            <defs>
              {/* Vibrant Area Gradient */}
              <linearGradient id="fastCryptoAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={gradientStart} />
                <stop offset="60%" stopColor={gradientStart} stopOpacity="0.08" />
                <stop offset="100%" stopColor={gradientStop} stopOpacity="0" />
              </linearGradient>

              {/* Glowing Line Drop Shadow Filter */}
              <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor={strokeColor} floodOpacity="0.45" />
              </filter>
            </defs>

            {/* Background Grid Horizontal Lines & Right Axis Price Labels */}
            {yLevels.map((pLevel, idx) => {
              const y = chartBottom - ((pLevel - minPrice) / priceRange) * chartHeight;
              return (
                <g key={idx}>
                  <line
                    x1={chartLeft}
                    y1={y}
                    x2={chartRight}
                    y2={y}
                    stroke="#1E293B"
                    strokeWidth="0.75"
                    strokeDasharray="3 3"
                    className="opacity-60"
                  />
                  <text
                    x={chartRight + 6}
                    y={y + 3.5}
                    fill="#64748B"
                    fontSize="9.5"
                    fontFamily="monospace"
                    fontWeight="500"
                    textAnchor="start"
                  >
                    ${pLevel.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </text>
                </g>
              );
            })}

            {/* Price To Beat Baseline Dashed Line */}
            <g>
              <line
                x1={chartLeft}
                y1={priceToBeatY}
                x2={chartRight}
                y2={priceToBeatY}
                stroke="#64748B"
                strokeWidth="1.2"
                strokeDasharray="4 3"
                className="opacity-75"
              />
            </g>

            {/* Target 5-Min Dashed Line */}
            <g>
              <line
                x1={chartLeft}
                y1={targetLineY}
                x2={chartRight}
                y2={targetLineY}
                stroke="#F59E0B"
                strokeWidth="1.2"
                strokeDasharray="4 4"
                className="opacity-60"
              />
            </g>

            {/* Filled Area Gradient beneath the spline */}
            {areaPath && (
              <path
                d={areaPath}
                fill="url(#fastCryptoAreaGradient)"
                className="transition-all duration-300"
              />
            )}

            {/* Smooth Spline Curve */}
            {splinePath && (
              <path
                d={splinePath}
                fill="none"
                stroke={strokeColor}
                strokeWidth="2.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#neonGlow)"
                className="transition-all duration-200"
              />
            )}

            {/* Hover Interactive Crosshair & Tooltip */}
            {activeHover && (
              <g>
                <line
                  x1={activeHover.x}
                  y1={chartTop}
                  x2={activeHover.x}
                  y2={chartBottom}
                  stroke="#94A3B8"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                  className="opacity-70"
                />
                <circle cx={activeHover.x} cy={activeHover.y} r="5" fill="#FFFFFF" stroke={strokeColor} strokeWidth="2.5" />
              </g>
            )}

            {/* Live Pulsing Beacon Head at the tip */}
            {!activeHover && (
              <g>
                <circle cx={lastPoint.x} cy={lastPoint.y} r="10" fill={strokeColor} opacity="0.25" className="animate-ping" />
                <circle cx={lastPoint.x} cy={lastPoint.y} r="5" fill="#FFFFFF" stroke={strokeColor} strokeWidth="2.5" />
              </g>
            )}

            {/* Invisible Hover Rectangles for Smooth Crosshair Hover Interaction */}
            {coords.map((c, i) => {
              const sliceW = chartWidth / coords.length;
              return (
                <rect
                  key={i}
                  x={c.x - sliceW / 2}
                  y={chartTop}
                  width={sliceW}
                  height={chartHeight}
                  fill="transparent"
                  className="cursor-crosshair"
                  onMouseEnter={() => setHoverIndex(i)}
                />
              );
            })}
          </svg>
        )}

        {/* CANDLESTICK CHART VIEW */}
        {chartMode === "candle" && (
          <div className="flex h-full w-full items-end justify-between px-3 pb-4 pt-2">
            {candles.map((c, idx) => {
              const isGreen = c.close >= c.open;
              const candleH = Math.max(6, Math.abs(c.close - c.open) * (height / priceRange) * 1.8);
              const wickH = Math.max(14, (c.high - c.low) * (height / priceRange) * 1.8);

              return (
                <div key={idx} className="flex flex-col items-center group relative cursor-pointer">
                  {/* Candle Wick */}
                  <div
                    className={cn("w-[1.5px]", isGreen ? "bg-emerald-400" : "bg-rose-400")}
                    style={{ height: `${Math.min(130, wickH)}px` }}
                  />
                  {/* Candle Body */}
                  <div
                    className={cn(
                      "w-3 rounded-[2px] shadow-sm -mt-[85%]",
                      isGreen ? "bg-emerald-500" : "bg-rose-500",
                    )}
                    style={{ height: `${Math.min(90, candleH)}px` }}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* COIN ANALYTICS METRICS VIEW */}
        {chartMode === "coin" && (
          <div className="grid h-full grid-cols-2 sm:grid-cols-4 gap-3 items-center p-3">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase">24h High</span>
              <div className="text-sm font-mono font-bold text-emerald-400 mt-1">${(basePrice * 1.018).toFixed(2)}</div>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase">24h Low</span>
              <div className="text-sm font-mono font-bold text-rose-400 mt-1">${(basePrice * 0.982).toFixed(2)}</div>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase">5-Min Volatility</span>
              <div className="text-sm font-mono font-bold text-amber-400 mt-1">±0.48%</div>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Consensus Prob</span>
              <div className="text-sm font-mono font-bold text-blue-400 mt-1">{isWinning ? "68% YES" : "59% NO"}</div>
            </div>
          </div>
        )}

        {/* Floating Tooltip during Hover */}
        {activeHover && (
          <div
            className="pointer-events-none absolute -top-2 rounded-lg border border-white/20 bg-slate-900/95 px-2.5 py-1 text-xs font-mono font-bold text-white shadow-xl backdrop-blur-md transition-all"
            style={{ left: Math.min(width - 120, Math.max(10, activeHover.x - 45)) }}
          >
            <span className="text-slate-400 text-[10px] block font-sans">Live Tick</span>
            <span className={cn(activeHover.price >= priceToBeat ? "text-emerald-400" : "text-amber-400")}>
              ${activeHover.price.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* X-Axis Dynamic Timestamps */}
      <div className="flex items-center justify-between px-2 text-[10px] font-mono text-slate-500 mt-1">
        {timestamps.map((t, idx) => (
          <span key={idx}>{t}</span>
        ))}
      </div>

      {/* Bottom Chart Footer Controls & Time Pills */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-3">
        {/* Time Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
          <button
            type="button"
            className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
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

        {/* View Mode Switcher (Line / Coin Analytics / Candlestick) */}
        <div className="flex items-center gap-1 bg-[#121829] p-0.5 rounded-lg border border-white/10">
          <button
            type="button"
            onClick={() => setChartMode("line")}
            title="Spline Line View"
            className={cn(
              "p-1.5 rounded-md text-xs transition-colors cursor-pointer",
              chartMode === "line" ? "bg-white/10 text-white font-bold" : "text-slate-400 hover:text-slate-200",
            )}
          >
            <TrendingUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setChartMode("coin")}
            title="Coin Metrics"
            className={cn(
              "p-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer",
              chartMode === "coin" ? "bg-white/10 text-amber-400 font-bold" : "text-slate-400 hover:text-slate-200",
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
              chartMode === "candle" ? "bg-white/10 text-white font-bold" : "text-slate-400 hover:text-slate-200",
            )}
          >
            <BarChart2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

