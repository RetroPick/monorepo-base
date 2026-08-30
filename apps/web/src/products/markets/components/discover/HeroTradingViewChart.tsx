"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { cn } from "@/shared/lib/utils";

interface SportsSlideData {
  team1: { name: string; code: string; prob: number; color: string };
  team2: { name: string; code: string; prob: number; color: string };
  historyTeam1?: number[];
  historyTeam2?: number[];
  timestamps?: string[];
}

interface OutcomeItem {
  label: string;
  percentage: number;
  color: string;
  history?: number[];
}

interface OutcomeSlideData {
  outcomes?: OutcomeItem[];
}

interface HeroTradingViewChartProps {
  isLiveSports: boolean;
  sportsData?: SportsSlideData;
  outcomeData?: OutcomeSlideData;
  selectedOutcomeIdx?: number;
  hoveredOutcomeIdx?: number | null;
  onSelectOutcome?: (idx: number) => void;
  onHoverOutcome?: (idx: number | null) => void;
  activeTeamTab?: "team1" | "team2";
  volume?: string;
}

interface Point {
  x: number;
  y: number;
  value: number;
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

// Deterministic PRNG
function createPrng(seedStr: string) {
  let h = 0xdeadbeef;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 2654435761);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h >>> 0) / 4294967296;
  };
}

// Generate realistic Polymarket stepped price discovery series with dynamic vertical action
function generatePolymarketSeries(
  targetPrice: number,
  timeframe: Timeframe,
  sampleCount: number,
  seedKey: string,
): { time: string; shortDate: string; value: number }[] {
  const prng = createPrng(seedKey);
  const volatility =
    timeframe === "1H"
      ? 2.2
      : timeframe === "6H"
        ? 4.2
        : timeframe === "1D"
          ? 7.2
          : timeframe === "1W"
            ? 11.5
            : timeframe === "1M"
              ? 16.0
              : 22.0;

  const startDrift = (prng() - 0.5) * volatility * 2.4;
  const startPrice = Math.max(2, Math.min(98, targetPrice - startDrift));

  const raw: number[] = [startPrice];
  let curr = startPrice;
  let holdCount = 0;

  for (let i = 1; i < sampleCount; i++) {
    if (holdCount > 0) {
      raw.push(curr);
      holdCount--;
      continue;
    }

    const u1 = Math.max(1e-6, prng());
    const u2 = prng();
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

    const jump = prng() < 0.16 ? (prng() - 0.5) * volatility * 2.4 : 0;
    const progress = i / (sampleCount - 1);
    const meanPull = (targetPrice - curr) * (0.05 + progress * 0.12);

    curr = Math.max(1, Math.min(99, curr + z * volatility * 0.4 + jump + meanPull));
    raw.push(Math.round(curr * 10) / 10);

    // Plateau hold for 2 to 4 intervals
    if (prng() < 0.42) {
      holdCount = Math.floor(prng() * 3) + 1;
    }
  }

  const wFinal = raw[sampleCount - 1];
  const now = Date.now();
  const stepMs =
    timeframe === "1H"
      ? 60 * 1000
      : timeframe === "6H"
        ? 5 * 60 * 1000
        : timeframe === "1D"
          ? 15 * 60 * 1000
          : timeframe === "1W"
            ? 2 * 3600 * 1000
            : timeframe === "1M"
              ? 8 * 3600 * 1000
              : 24 * 3600 * 1000;

  return raw.map((val, i) => {
    const progress = i / (sampleCount - 1);
    const adjusted = val + Math.pow(progress, 1.2) * (targetPrice - wFinal);
    const finalVal =
      i === sampleCount - 1 ? targetPrice : Math.round(Math.max(1, Math.min(99, adjusted)) * 10) / 10;

    const t = new Date(now - (sampleCount - 1 - i) * stepMs);
    const timeStr =
      t.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
      ", " +
      t.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

    const shortDate =
      timeframe === "1H" || timeframe === "6H"
        ? t.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
        : t.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    return { time: timeStr, shortDate, value: finalVal };
  });
}

// Build crisp Polymarket stepped path
function buildPolymarketStepPath(points: Point[]): string {
  if (points.length === 0) return "";
  let d = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    d += ` L ${curr.x.toFixed(1)},${prev.y.toFixed(1)} L ${curr.x.toFixed(1)},${curr.y.toFixed(1)}`;
  }
  return d;
}

export function HeroTradingViewChart({
  isLiveSports,
  sportsData,
  outcomeData,
  selectedOutcomeIdx = 0,
  hoveredOutcomeIdx = null,
  onSelectOutcome,
  onHoverOutcome,
}: HeroTradingViewChartProps) {
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 480, height: 210 });
  const [timeframe, setTimeframe] = useState<Timeframe>("ALL");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  const sampleCount = 48;

  // Measure SVG container dimensions accurately
  useEffect(() => {
    const el = svgContainerRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      if (entries.length > 0) {
        const { width, height } = entries[0].contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const chartMargin = { top: 12, bottom: 10, left: 8, right: 42 };
  const plotWidth = Math.max(10, dimensions.width - chartMargin.left - chartMargin.right);
  const plotHeight = Math.max(10, dimensions.height - chartMargin.top - chartMargin.bottom);

  // Generate lines series data
  const lines = useMemo(() => {
    if (isLiveSports && sportsData) {
      const data1 = generatePolymarketSeries(
        sportsData.team1.prob,
        timeframe,
        sampleCount,
        `${sportsData.team1.name}-${timeframe}`,
      );
      const data2 = generatePolymarketSeries(
        sportsData.team2.prob,
        timeframe,
        sampleCount,
        `${sportsData.team2.name}-${timeframe}`,
      );
      return [
        {
          id: "team1",
          label: sportsData.team1.name,
          color: sportsData.team1.color || "#3B82F6",
          current: sportsData.team1.prob,
          data: data1,
          isSelected: selectedOutcomeIdx === 0,
        },
        {
          id: "team2",
          label: sportsData.team2.name,
          color: sportsData.team2.color || "#A855F7",
          current: sportsData.team2.prob,
          data: data2,
          isSelected: selectedOutcomeIdx === 1,
        },
      ];
    }

    if (outcomeData?.outcomes && outcomeData.outcomes.length > 0) {
      return outcomeData.outcomes.map((out, idx) => {
        const data = generatePolymarketSeries(
          out.percentage,
          timeframe,
          sampleCount,
          `${out.label}-${timeframe}-${idx}`,
        );
        return {
          id: `out-${idx}`,
          label: out.label,
          color: out.color || "#3B82F6",
          current: out.percentage,
          data,
          isSelected: selectedOutcomeIdx === idx,
        };
      });
    }

    return [];
  }, [isLiveSports, sportsData, outcomeData, selectedOutcomeIdx, sampleCount, timeframe]);

  // Compute paths, points, and area
  const computedLines = useMemo(() => {
    const bottomY = chartMargin.top + plotHeight;

    return lines.map((line, lineIdx) => {
      const points: Point[] = line.data.map((item, i) => {
        const x = chartMargin.left + (i / Math.max(1, sampleCount - 1)) * plotWidth;
        const normY = Math.max(0, Math.min(100, item.value)) / 100;
        const y = chartMargin.top + (1 - normY) * plotHeight;
        return { x, y, value: item.value };
      });

      const stepPath = buildPolymarketStepPath(points);
      const firstPt = points[0] || { x: chartMargin.left, y: bottomY };
      const lastPt = points[points.length - 1] || { x: chartMargin.left + plotWidth, y: bottomY / 2 };
      const areaPath = `${stepPath} L ${lastPt.x.toFixed(1)},${bottomY.toFixed(1)} L ${firstPt.x.toFixed(1)},${bottomY.toFixed(1)} Z`;

      const isHovered = hoveredOutcomeIdx === lineIdx;
      const isEmphasized = line.isSelected || isHovered;

      return {
        ...line,
        points,
        stepPath,
        areaPath,
        firstPt,
        lastPt,
        lineIdx,
        isHovered,
        isEmphasized,
      };
    });
  }, [lines, plotWidth, plotHeight, chartMargin, sampleCount, hoveredOutcomeIdx]);

  // Active line calculation
  const activeLine =
    computedLines.find((l) => l.isHovered) ||
    computedLines.find((l) => l.isSelected) ||
    computedLines[0];

  // Active price & change calculation
  const activeSeries = activeLine?.data || [];
  const latestPrice = activeLine?.current ?? 50;
  const firstPrice = activeSeries[0]?.value ?? latestPrice;
  const currentHoveredPrice =
    hoverIndex !== null && activeLine?.points[hoverIndex]
      ? activeLine.points[hoverIndex].value
      : latestPrice;
  const priceChange = Math.round((currentHoveredPrice - firstPrice) * 10) / 10;
  const isPositive = priceChange >= 0;

  const currentHoverTime =
    hoverIndex !== null && activeSeries[hoverIndex]
      ? activeSeries[hoverIndex].time
      : activeSeries[activeSeries.length - 1]?.time || "";

  const currentShortDate =
    hoverIndex !== null && activeSeries[hoverIndex]
      ? activeSeries[hoverIndex].shortDate
      : null;

  // Grid levels (0%, 25%, 50%, 75%, 100%)
  const gridLevels = [100, 75, 50, 25, 0];

  // Time scale ticks
  const timeTicks = useMemo(() => {
    if (!activeSeries || activeSeries.length === 0) return [];
    const step = Math.floor((sampleCount - 1) / 4);
    return [0, step, step * 2, step * 3, sampleCount - 1].map((idx) => {
      const x = chartMargin.left + (idx / Math.max(1, sampleCount - 1)) * plotWidth;
      const label = activeSeries[idx]?.shortDate || "";
      return { x, label };
    });
  }, [activeSeries, sampleCount, plotWidth, chartMargin]);

  // Mouse move handler
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - chartMargin.left;
    const mouseY = e.clientY - rect.top;
    const ratio = Math.max(0, Math.min(1, mouseX / plotWidth));
    const idx = Math.round(ratio * (sampleCount - 1));
    setHoverIndex(idx);
    setMousePos({ x: e.clientX - rect.left, y: mouseY });
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
    setMousePos(null);
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between select-none overflow-hidden font-sans">
      {/* Top Header: Clean Subtle Polymarket Status Line (Small & Compact) */}
      <div className="flex items-center justify-between px-1 mb-2 shrink-0 gap-2 overflow-hidden">
        {/* Left: Active Outcome + Probability + Delta */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1 whitespace-nowrap">
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{
              backgroundColor: activeLine?.color || "#38BDF8",
              boxShadow: `0 0 5px ${activeLine?.color || "#38BDF8"}`,
            }}
          />
          <span className="font-semibold text-xs text-white truncate max-w-[160px]">
            {activeLine?.label}
          </span>
          <span
            className="font-mono text-xs font-bold"
            style={{ color: activeLine?.color || "#38BDF8" }}
          >
            {currentHoveredPrice}%
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-[10.5px] font-bold font-mono",
              isPositive ? "text-emerald-400" : "text-rose-400",
            )}
          >
            {isPositive ? "▲" : "▼"} {Math.abs(priceChange)}%
          </span>
        </div>

        {/* Right: Date / Time + Live Badge */}
        <div className="flex items-center gap-1.5 text-[10.5px] font-mono text-slate-400 shrink-0 whitespace-nowrap">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-400 font-bold hidden sm:inline">LIVE</span>
          <span className="text-slate-600 hidden sm:inline">·</span>
          <span>{currentHoverTime}</span>
        </div>
      </div>

      {/* Main SVG Chart Canvas (Enlarged Polymarket Step-Line Discovery) */}
      <div ref={svgContainerRef} className="relative flex-1 w-full overflow-hidden min-h-[180px]">
        <svg
          className="w-full h-full cursor-crosshair overflow-visible"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            {computedLines.map((line) => (
              <linearGradient
                key={`poly-grad-${line.id}`}
                id={`poly-grad-${line.id}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor={line.color}
                  stopOpacity={line.isEmphasized ? 0.26 : 0.04}
                />
                <stop
                  offset="70%"
                  stopColor={line.color}
                  stopOpacity={line.isEmphasized ? 0.06 : 0.0}
                />
                <stop offset="100%" stopColor={line.color} stopOpacity="0.0" />
              </linearGradient>
            ))}
          </defs>

          {/* Dotted Horizontal Gridlines & Y-Axis Scale */}
          {gridLevels.map((lvl) => {
            const y = chartMargin.top + (1 - lvl / 100) * plotHeight;
            return (
              <g key={`poly-grid-${lvl}`}>
                <line
                  x1={chartMargin.left}
                  y1={y}
                  x2={chartMargin.left + plotWidth}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.06)"
                  strokeDasharray="3 4"
                  strokeWidth="1"
                />
                <text
                  x={chartMargin.left + plotWidth + 8}
                  y={y + 4}
                  fill="#64748B"
                  fontSize={10.5}
                  fontFamily="ui-monospace, monospace"
                  fontWeight={500}
                >
                  {lvl}%
                </text>
              </g>
            );
          })}

          {/* Glowing Area Fill under Active Curve */}
          {computedLines.map((line) => {
            if (!line.isEmphasized) return null;
            return (
              <path
                key={`poly-area-${line.id}`}
                d={line.areaPath}
                fill={`url(#poly-grad-${line.id})`}
                className="transition-all duration-300 pointer-events-none"
              />
            );
          })}

          {/* Crosshair Horizontal Guideline to Active Price (Image 1 style) */}
          {hoverIndex !== null && activeLine?.points[hoverIndex] && (
            <g className="pointer-events-none">
              <line
                x1={chartMargin.left}
                y1={activeLine.points[hoverIndex].y}
                x2={chartMargin.left + plotWidth}
                y2={activeLine.points[hoverIndex].y}
                stroke={activeLine.color}
                strokeDasharray="2 3"
                strokeWidth="1.2"
                strokeOpacity="0.5"
              />
              {/* Right Y-Axis Active Price Pill Badge */}
              <rect
                x={chartMargin.left + plotWidth + 3}
                y={activeLine.points[hoverIndex].y - 9}
                width={36}
                height={18}
                rx={4}
                fill={activeLine.color}
              />
              <text
                x={chartMargin.left + plotWidth + 21}
                y={activeLine.points[hoverIndex].y + 4}
                textAnchor="middle"
                fill="#FFFFFF"
                fontSize={10}
                fontWeight={800}
                fontFamily="ui-monospace, monospace"
              >
                {Math.round(activeLine.points[hoverIndex].value)}%
              </text>
            </g>
          )}

          {/* Stepped Lines */}
          {computedLines.map((line) => {
            const isEmp = line.isEmphasized;
            return (
              <g
                key={`poly-line-${line.id}`}
                className="transition-all duration-150"
                onMouseEnter={() => onHoverOutcome?.(line.lineIdx)}
                onMouseLeave={() => onHoverOutcome?.(null)}
              >
                {/* Main Crisp Stepped Line */}
                <path
                  d={line.stepPath}
                  fill="none"
                  stroke={line.color}
                  strokeWidth={isEmp ? 2.6 : 1.6}
                  strokeOpacity={isEmp ? 1.0 : 0.35}
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                  className="transition-all duration-150"
                />

                {/* Endpoint Dot */}
                <circle
                  cx={line.lastPt.x}
                  cy={line.lastPt.y}
                  r={isEmp ? 4 : 2.5}
                  fill={line.color}
                  stroke="#0E1422"
                  strokeWidth={2}
                  className="transition-all duration-150"
                />

                {isEmp && (
                  <circle
                    cx={line.lastPt.x}
                    cy={line.lastPt.y}
                    r={7}
                    fill="none"
                    stroke={line.color}
                    strokeWidth="1.5"
                    strokeOpacity="0.4"
                    className="animate-ping origin-center"
                  />
                )}
              </g>
            );
          })}

          {/* Interactive Vertical Crosshair Line (Image 1 & 3 style) */}
          {hoverIndex !== null && computedLines[0]?.points[hoverIndex] && (
            <g className="pointer-events-none">
              <line
                x1={computedLines[0].points[hoverIndex].x}
                y1={chartMargin.top}
                x2={computedLines[0].points[hoverIndex].x}
                y2={chartMargin.top + plotHeight}
                stroke="rgba(148, 163, 184, 0.45)"
                strokeDasharray="2 3"
                strokeWidth="1.2"
              />

              {/* Crosshair Intersect Dots */}
              {computedLines.map((line) => {
                const p = line.points[hoverIndex];
                if (!p) return null;
                const isEmp = line.isEmphasized;
                return (
                  <circle
                    key={`poly-cross-pt-${line.id}`}
                    cx={p.x}
                    cy={p.y}
                    r={isEmp ? 4.5 : 3}
                    fill={line.color}
                    stroke="#0E1422"
                    strokeWidth={2}
                  />
                );
              })}
            </g>
          )}
        </svg>

        {/* Floating Outcome Labels along the Crosshair (Exact Match to Image 3) */}
        {hoverIndex !== null && computedLines[0]?.points[hoverIndex] && (
          <div
            className="absolute pointer-events-none z-30 flex flex-col gap-1.5 text-xs"
            style={{
              left: `${Math.min(
                dimensions.width - 160,
                Math.max(10, computedLines[0].points[hoverIndex].x + 10),
              )}px`,
              top: `${Math.max(
                6,
                Math.min(
                  dimensions.height - 110,
                  (activeLine?.points[hoverIndex]?.y || dimensions.height / 2) - 35,
                ),
              )}px`,
            }}
          >
            {computedLines.map((line) => {
              const p = line.points[hoverIndex];
              const val = p ? p.value : line.current;
              return (
                <div
                  key={`poly-tip-${line.id}`}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border border-white/10 bg-[#0B101B]/95 px-2.5 py-1 shadow-2xl backdrop-blur-md transition-all",
                    line.isEmphasized ? "border-white/25 text-white font-bold" : "text-slate-300",
                  )}
                >
                  <span
                    className="h-3.5 w-1.2 rounded-full shrink-0"
                    style={{ backgroundColor: line.color }}
                  />
                  <span className="truncate max-w-[100px] text-[11px]">{line.label}</span>
                  <span
                    className="font-mono font-bold text-xs ml-auto pl-1.5"
                    style={{ color: line.color }}
                  >
                    {val}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Axis: Date Ticks + Active Date Pill (Image 1 style) */}
      <div className="relative w-full h-5 text-[10.5px] font-mono text-slate-400 shrink-0 flex items-center justify-between px-2 pt-1">
        {timeTicks.map((tick, idx) => (
          <span
            key={idx}
            className={cn(
              "select-none transition-colors",
              idx === 0 ? "text-left" : idx === timeTicks.length - 1 ? "text-right" : "text-center",
            )}
          >
            {tick.label}
          </span>
        ))}

        {/* Floating Date Pill on Active Hover (Image 1 style) */}
        {currentShortDate && hoverIndex !== null && computedLines[0]?.points[hoverIndex] && (
          <div
            className="absolute -top-0.5 transform -translate-x-1/2 rounded-md border border-white/15 bg-[#161D2E] px-2.5 py-0.5 text-[10.5px] font-mono font-bold text-white shadow-md pointer-events-none"
            style={{
              left: `${Math.max(
                40,
                Math.min(dimensions.width - 40, computedLines[0].points[hoverIndex].x),
              )}px`,
            }}
          >
            {currentShortDate}
          </div>
        )}
      </div>
    </div>
  );
}

export default HeroTradingViewChart;
