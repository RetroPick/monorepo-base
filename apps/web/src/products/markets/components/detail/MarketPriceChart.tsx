"use client";

import { useState, useMemo } from "react";
import { cn } from "@/shared/lib/utils";
import { TrendingUp, TrendingDown, Clock, Award, ChevronDown } from "lucide-react";
import type { TradeOption } from "./PolymarketTradeBox";

interface MarketPriceChartProps {
  initialProbYes?: number;
  marketTitle?: string;
  category?: string;
  volume?: string;
  endDate?: string;
  options?: TradeOption[];
  selectedOptionIdx?: number;
  onSelectOption?: (idx: number) => void;
}

const TIMEFRAMES = [
  { id: "1H", label: "1H" },
  { id: "6H", label: "6H" },
  { id: "1D", label: "1D" },
  { id: "1W", label: "1W" },
  { id: "1M", label: "1M" },
  { id: "ALL", label: "ALL" },
] as const;

type Timeframe = (typeof TIMEFRAMES)[number]["id"];

const OUTCOME_COLORS = ["#3B82F6", "#60A5FA", "#F59E0B", "#F97316", "#10B981", "#EC4899"];

// Pseudo-random deterministic generator based on seed string
function createPrng(seedStr: string) {
  let h = 0xdeadbeef;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 2654435761);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h >>> 0) / 4294967296);
  };
}

// Generate realistic financial Brownian bridge values
function generateBrownianBridgeValues(targetPrice: number, count: number, timeframe: Timeframe, seedKey: string): number[] {
  const prng = createPrng(seedKey);
  const volatility = timeframe === "1H" ? 0.4 : timeframe === "6H" ? 0.8 : timeframe === "1D" ? 1.5 : timeframe === "1W" ? 2.5 : 4.0;
  const startDrift = (prng() - 0.5) * volatility * 2.5;
  const startPrice = Math.max(1, Math.min(99, targetPrice - startDrift));

  const w: number[] = [0];
  for (let i = 1; i < count; i++) {
    const u1 = Math.max(1e-6, prng());
    const u2 = prng();
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    const jump = prng() < 0.05 ? (prng() - 0.5) * volatility * 3 : 0;
    w.push(w[i - 1] + z * volatility * 0.35 + jump);
  }

  const wFinal = w[count - 1];
  const values: number[] = [];
  for (let i = 0; i < count; i++) {
    const progress = i / (count - 1);
    const trend = startPrice + progress * (targetPrice - startPrice);
    const bridge = w[i] - progress * wFinal;
    let val = trend + bridge;
    val = Math.max(0.5, Math.min(99.5, val));
    values.push(i === count - 1 ? targetPrice : Math.round(val * 10) / 10);
  }
  return values;
}

// Helper for ultra-smooth Bezier spline path
function getSplinePath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

export function MarketPriceChart({
  initialProbYes = 41,
  marketTitle = "Market",
  category = "Crypto",
  volume = "$16,581,088 Vol.",
  endDate = "Dec 31, 2026",
  options,
  selectedOptionIdx = 0,
  onSelectOption,
}: MarketPriceChartProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>("ALL");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const isMultiOutcome = Boolean(options && options.length >= 2);
  const isMeetingDates = isMultiOutcome && options?.some((o) => o.label.includes("Sep") || o.label.includes("Aug") || o.label.includes("Oct") || o.label.includes("bps"));

  // SVG Chart Dimensions
  const width = 640;
  const height = 220;
  const paddingX = 16;
  const paddingY = 24;

  // Generate smooth synchronized series data
  const seriesList = useMemo(() => {
    const pointsCount = timeframe === "1H" ? 24 : timeframe === "6H" ? 32 : timeframe === "1D" ? 40 : timeframe === "1W" ? 50 : 60;

    if (isMultiOutcome && options) {
      return options.map((opt, optIdx) => {
        const color = OUTCOME_COLORS[optIdx % OUTCOME_COLORS.length];
        const seedKey = `${marketTitle}-${opt.label}-${timeframe}-${optIdx}`;
        const rawVals = generateBrownianBridgeValues(opt.percentage, pointsCount, timeframe, seedKey);
        
        const pts = rawVals.map((val, i) => {
          const t = i / (pointsCount - 1);
          const x = paddingX + t * (width - paddingX * 2 - 40);
          const y = height - paddingY - (val / 100) * (height - paddingY * 2);
          return { x, y, val };
        });

        return {
          label: opt.label,
          percentage: opt.percentage,
          color,
          points: pts,
        };
      });
    }

    // Single Binary Outcome Series (YES)
    const seedKey = `${marketTitle}-YES-${timeframe}`;
    const rawVals = generateBrownianBridgeValues(initialProbYes, pointsCount, timeframe, seedKey);
    const pts = rawVals.map((val, i) => {
      const t = i / (pointsCount - 1);
      const x = paddingX + t * (width - paddingX * 2 - 40);
      const y = height - paddingY - (val / 100) * (height - paddingY * 2);
      return { x, y, val };
    });

    return [
      {
        label: "YES",
        percentage: initialProbYes,
        color: "#3B82F6",
        points: pts,
      },
    ];
  }, [options, isMultiOutcome, initialProbYes, timeframe, marketTitle]);

  // Current active value (hovered or latest)
  const activeSeries = seriesList[selectedOptionIdx] || seriesList[0];
  const activePoints = activeSeries.points;
  const currentHoverPoint = hoveredIdx !== null && activePoints[hoveredIdx] ? activePoints[hoveredIdx] : activePoints[activePoints.length - 1];
  const displayVal = currentHoverPoint?.val ?? activeSeries.percentage;

  const startVal = activePoints[0]?.val ?? displayVal;
  const priceChange = Math.round((displayVal - startVal) * 10) / 10;
  const isPositive = priceChange >= 0;

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0E1422] p-5 shadow-xl transition-all space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-slate-400">YES Chance Price</div>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="font-mono text-3xl font-black text-white">{displayVal}¢</span>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-bold font-mono",
                isPositive ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400",
              )}
            >
              {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {isPositive ? "+" : ""}
              {priceChange}% ({timeframe})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs font-bold text-slate-400 font-mono">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.id}
              type="button"
              onClick={() => setTimeframe(tf.id)}
              className={cn(
                "px-2.5 py-1 rounded-lg transition-all cursor-pointer",
                timeframe === tf.id ? "bg-blue-600 text-white font-black shadow-md shadow-blue-600/30" : "hover:text-white hover:bg-white/5",
              )}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Chart Area */}
      <div className="relative w-full h-[220px]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          {/* Grid lines */}
          <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
          <line x1={paddingX} y1={height / 2} x2={width - paddingX} y2={height / 2} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
          <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />

          {/* Series lines */}
          {seriesList.map((s, idx) => {
            const isSelected = selectedOptionIdx === idx;
            const linePath = getSplinePath(s.points);
            return (
              <path
                key={idx}
                d={linePath}
                fill="none"
                stroke={s.color}
                strokeWidth={isSelected ? 3 : 1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-300"
              />
            );
          })}
        </svg>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-white/[0.06] pt-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Award className="h-3.5 w-3.5 text-amber-400" />
          <span>{volume}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-slate-500" />
          <span>{endDate}</span>
        </div>
      </div>
    </div>
  );
}

export default MarketPriceChart;
