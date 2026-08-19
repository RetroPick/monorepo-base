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
    const pointsCount = timeframe === "1H" ? 14 : timeframe === "6H" ? 20 : timeframe === "1D" ? 24 : timeframe === "1W" ? 28 : 34;

    if (isMultiOutcome && options) {
      return options.map((opt, optIdx) => {
        const base = opt.percentage;
        const color = OUTCOME_COLORS[optIdx % OUTCOME_COLORS.length];
        const pts: { x: number; y: number; val: number }[] = [];

        let current = Math.max(1, base - (optIdx === 0 ? 16 : -8));
        for (let i = 0; i < pointsCount; i++) {
          const t = i / (pointsCount - 1);
          const wave = Math.sin(i * 0.42 + optIdx * 1.6) * (optIdx === 0 ? 7 : 3.5);
          const noise = (i % 3 === 0 ? 1 : -1) * (optIdx === 0 ? 2 : 1);
          current = Math.min(99, Math.max(0.5, current + wave * 0.35 + noise));

          const val = i === pointsCount - 1 ? base : Math.round(current * 10) / 10;
          const x = paddingX + t * (width - paddingX * 2 - 40);
          const y = height - paddingY - (val / 100) * (height - paddingY * 2);
          pts.push({ x, y, val });
        }

        return {
          label: opt.label,
          percentage: opt.percentage,
          color,
          points: pts,
        };
      });
    }

    // Single Binary Outcome Series (YES)
    const base = initialProbYes;
    const pts: { x: number; y: number; val: number }[] = [];
    let current = Math.max(5, base - 10);

    for (let i = 0; i < pointsCount; i++) {
      const t = i / (pointsCount - 1);
      const wave = Math.sin(i * 0.45) * 6 + ((i % 3 === 0 ? 1 : -1) * 2.5);
      current = Math.min(98, Math.max(2, current + wave * 0.4));

      const val = i === pointsCount - 1 ? base : Math.round(current * 10) / 10;
      const x = paddingX + t * (width - paddingX * 2 - 40);
      const y = height - paddingY - (val / 100) * (height - paddingY * 2);
      pts.push({ x, y, val });
    }

    return [
      {
        label: "YES",
        percentage: base,
        color: "#3B82F6",
        points: pts,
      },
    ];
  }, [options, isMultiOutcome, initialProbYes, timeframe]);

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
      {/* Top Header Row: Meeting Dates OR Single Price Header */}
      {isMeetingDates ? (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-xs">
          <button
            type="button"
            className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 font-bold text-slate-300 hover:text-white"
          >
            <span>Past</span>
            <ChevronDown className="h-3 w-3" />
          </button>
          {options?.slice(0, 4).map((opt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectOption && onSelectOption(idx)}
              className={cn(
                "rounded-xl px-3.5 py-1.5 font-bold transition-all cursor-pointer whitespace-nowrap",
                selectedOptionIdx === idx
                  ? "bg-white text-slate-900 shadow-md font-extrabold"
                  : "text-slate-400 hover:text-white hover:bg-white/5",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <span>YES Chance Price</span>
              <span className="h-1 w-1 rounded-full bg-slate-600" />
              <span className="text-slate-300">Live Consensus</span>
            </div>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="font-mono text-3xl font-black text-white">
                {displayVal < 1 ? "0.4¢" : `${displayVal}¢`}
              </span>
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
                  timeframe === tf.id
                    ? "bg-blue-600 text-white font-black shadow-md shadow-blue-600/30"
                    : "hover:text-white hover:bg-white/5",
                )}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Outcome Legend with Synchronized Percentages */}
      {isMultiOutcome && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-bold pt-1">
          {seriesList.map((s, idx) => {
            const isSelected = selectedOptionIdx === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectOption && onSelectOption(idx)}
                className={cn(
                  "flex items-center gap-1.5 transition-all cursor-pointer px-2 py-1 rounded-lg",
                  isSelected ? "bg-white/10" : "hover:bg-white/5 opacity-80",
                )}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-slate-300">{s.label}</span>
                <span className="font-mono text-white font-black">{s.percentage}%</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Interactive SVG Chart Canvas with Cubic Spline */}
      <div className="relative h-[220px] w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-full w-full overflow-visible"
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <defs>
            <linearGradient id="splineAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Guideline Percentages */}
          {[100, 75, 50, 25, 0].map((pct) => {
            const y = height - paddingY - (pct / 100) * (height - paddingY * 2);
            return (
              <g key={pct}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - 40}
                  y2={y}
                  stroke="#1E293B"
                  strokeWidth="0.8"
                  strokeDasharray="3 3"
                  className="opacity-40"
                />
                <text
                  x={width - 32}
                  y={y + 3}
                  fill="#64748B"
                  fontSize="9"
                  fontFamily="monospace"
                  textAnchor="start"
                >
                  {pct}%
                </text>
              </g>
            );
          })}

          {/* Area gradient for single outcome */}
          {!isMultiOutcome && (
            <path
              d={`${getSplinePath(activePoints)} L ${activePoints[activePoints.length - 1].x} ${height - paddingY} L ${activePoints[0].x} ${height - paddingY} Z`}
              fill="url(#splineAreaGradient)"
            />
          )}

          {/* Polyline Splines */}
          {seriesList.map((s, idx) => {
            const pathD = getSplinePath(s.points);
            const lastPt = s.points[s.points.length - 1];

            return (
              <g key={idx}>
                <path
                  d={pathD}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx={lastPt.x} cy={lastPt.y} r="3.5" fill={s.color} className="animate-pulse" />
              </g>
            );
          })}

          {/* Hover Crosshair & Circles */}
          {hoveredIdx !== null && activePoints[hoveredIdx] && (
            <g>
              <line
                x1={activePoints[hoveredIdx].x}
                y1={paddingY}
                x2={activePoints[hoveredIdx].x}
                y2={height - paddingY}
                stroke="#60A5FA"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <circle
                cx={activePoints[hoveredIdx].x}
                cy={activePoints[hoveredIdx].y}
                r="5"
                fill="#FFFFFF"
                stroke="#3B82F6"
                strokeWidth="2"
              />
            </g>
          )}

          {/* Invisible interactive hover rects */}
          {activePoints.map((pt, i) => (
            <rect
              key={i}
              x={pt.x - 10}
              y={0}
              width={20}
              height={height}
              fill="transparent"
              className="cursor-crosshair"
              onMouseEnter={() => setHoveredIdx(i)}
            />
          ))}
        </svg>
      </div>

      {/* Month X-Axis Timestamps */}
      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 px-3">
        <span>Jun</span>
        <span>Jul</span>
        <span>Aug</span>
        <span>Sep</span>
      </div>

      {/* Bottom Footer Row: Volume & Expiry + Timeframe Switcher (if meeting dates) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-3 text-xs">
        <div className="flex items-center gap-3 font-semibold text-slate-400">
          <span className="flex items-center gap-1 text-slate-200 font-bold">
            <Award className="h-3.5 w-3.5 text-amber-400" />
            <span>{volume}</span>
          </span>
          <span>·</span>
          <span className="flex items-center gap-1 text-slate-400">
            <Clock className="h-3 w-3" />
            <span>{endDate}</span>
          </span>
        </div>

        {isMeetingDates && (
          <div className="flex items-center gap-1 text-xs font-bold text-slate-400 font-mono">
            {TIMEFRAMES.map((tf) => {
              const active = timeframe === tf.id;
              return (
                <button
                  key={tf.id}
                  type="button"
                  onClick={() => setTimeframe(tf.id)}
                  className={cn(
                    "px-2 py-0.5 rounded-md transition-all cursor-pointer",
                    active
                      ? "bg-white text-slate-900 font-black shadow-sm"
                      : "hover:text-white hover:bg-white/5",
                  )}
                >
                  {tf.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
