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
  onSelectOutcome?: (idx: number) => void;
  activeTeamTab?: "team1" | "team2";
}

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

// Generate authentic Polymarket stepped price series
function generateSteppedSeries(
  targetPrice: number,
  count: number,
  seedKey: string,
): number[] {
  const prng = createPrng(seedKey);
  const volatility = 4.0;

  const startDrift = (prng() - 0.5) * volatility * 2.2;
  const startPrice = Math.max(1, Math.min(99, targetPrice - startDrift));

  const raw: number[] = [startPrice];
  let curr = startPrice;
  let holdCount = 0;

  for (let i = 1; i < count; i++) {
    if (holdCount > 0) {
      raw.push(curr);
      holdCount--;
      continue;
    }

    const u1 = Math.max(1e-6, prng());
    const u2 = prng();
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

    const jump = prng() < 0.15 ? (prng() - 0.5) * volatility * 2.2 : 0;
    const progress = i / (count - 1);
    const meanPull = (targetPrice - curr) * (0.05 + progress * 0.08);

    curr = Math.max(0.5, Math.min(99.5, curr + z * volatility * 0.4 + jump + meanPull));
    raw.push(Math.round(curr * 10) / 10);

    // Plateau hold for 2 to 4 samples
    if (prng() < 0.45) {
      holdCount = Math.floor(prng() * 3) + 1;
    }
  }

  // Anchor final value to exact target
  const wFinal = raw[count - 1];
  return raw.map((val, i) => {
    const progress = i / (count - 1);
    const adjusted = val + progress * (targetPrice - wFinal);
    return i === count - 1 ? targetPrice : Math.round(Math.max(0.5, Math.min(99.5, adjusted)) * 10) / 10;
  });
}

// Step-line path builder
function buildSteppedPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  let d = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    // Stepped horizontal then vertical
    d += ` L ${curr.x.toFixed(1)},${prev.y.toFixed(1)} L ${curr.x.toFixed(1)},${curr.y.toFixed(1)}`;
  }
  return d;
}

export function HeroTradingViewChart({
  isLiveSports,
  sportsData,
  outcomeData,
  selectedOutcomeIdx = 0,
  onSelectOutcome,
}: HeroTradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 440, height: 210 });
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const sampleCount = 65;

  // Measure container dimensions
  useEffect(() => {
    const el = containerRef.current;
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

  const chartMargin = { top: 38, bottom: 20, left: 12, right: 46 };
  const plotWidth = Math.max(10, dimensions.width - chartMargin.left - chartMargin.right);
  const plotHeight = Math.max(10, dimensions.height - chartMargin.top - chartMargin.bottom);

  // Generate synthetic timestamps
  const timestamps = useMemo(() => {
    const now = Date.now();
    const stepMs = 45 * 60 * 1000; // 45 min
    const arr: string[] = [];
    for (let i = 0; i < sampleCount; i++) {
      const t = new Date(now - (sampleCount - 1 - i) * stepMs);
      arr.push(
        t.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
          ", " +
          t.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
      );
    }
    return arr;
  }, [sampleCount]);

  // Generate lines series data
  const lines = useMemo(() => {
    if (isLiveSports && sportsData) {
      const data1 = generateSteppedSeries(sportsData.team1.prob, sampleCount, `${sportsData.team1.name}-step`);
      const data2 = generateSteppedSeries(sportsData.team2.prob, sampleCount, `${sportsData.team2.name}-step`);
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
        const data = generateSteppedSeries(out.percentage, sampleCount, `${out.label}-step-${idx}`);
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
  }, [isLiveSports, sportsData, outcomeData, selectedOutcomeIdx, sampleCount]);

  // Calculate coordinates & paths
  const computedLines = useMemo(() => {
    return lines.map((line, lineIdx) => {
      const points = line.data.map((val, i) => {
        const x = chartMargin.left + (i / Math.max(1, sampleCount - 1)) * plotWidth;
        const normY = Math.max(0, Math.min(100, val)) / 100;
        const y = chartMargin.top + (1 - normY) * plotHeight;
        return { x, y, value: val };
      });

      const steppedPath = buildSteppedPath(points);
      const lastPt = points[points.length - 1] || { x: chartMargin.left + plotWidth, y: chartMargin.top + plotHeight / 2 };
      const firstPt = points[0] || { x: chartMargin.left, y: chartMargin.top + plotHeight };
      const areaPath = `${steppedPath} L ${lastPt.x.toFixed(1)},${(chartMargin.top + plotHeight).toFixed(1)} L ${firstPt.x.toFixed(1)},${(chartMargin.top + plotHeight).toFixed(1)} Z`;

      return {
        ...line,
        points,
        steppedPath,
        areaPath,
        lastPt,
        lineIdx,
      };
    });
  }, [lines, plotWidth, plotHeight, chartMargin, sampleCount]);

  // Handle crosshair hover
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - chartMargin.left;
    const ratio = Math.max(0, Math.min(1, mouseX / plotWidth));
    const idx = Math.round(ratio * (sampleCount - 1));
    setHoverIndex(idx);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const currentHoverTime = hoverIndex !== null ? timestamps[hoverIndex] : null;

  // Grid levels matching Polymarket
  const gridLevels = [100, 75, 50, 25, 0];

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[210px] flex flex-col justify-between select-none">
      {/* Top Legend Bar & Hover Time Indicator */}
      <div className="flex items-center justify-between gap-2 px-1 mb-1 text-[11px]">
        {/* Outcome Badges Legend */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {computedLines.map((line) => {
            const displayVal = hoverIndex !== null && line.points[hoverIndex]
              ? line.points[hoverIndex].value
              : line.current;
            return (
              <button
                key={`legend-${line.id}`}
                type="button"
                onClick={() => onSelectOutcome?.(line.lineIdx)}
                className={cn(
                  "inline-flex items-center gap-1.5 transition-colors cursor-pointer text-[11px] font-semibold",
                  line.isSelected ? "text-white font-bold" : "text-slate-400 hover:text-slate-200"
                )}
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: line.color }}
                />
                <span className="truncate max-w-[90px]">{line.label}</span>
                <span className="font-mono font-bold" style={{ color: line.color }}>
                  {displayVal}%
                </span>
              </button>
            );
          })}
        </div>

        {/* Hover Date/Time Tooltip Header */}
        <div className="text-[10px] font-mono text-slate-500 shrink-0 font-medium">
          {currentHoverTime || (timestamps[timestamps.length - 1] ?? "")}
        </div>
      </div>

      {/* Main SVG TradingView Style Canvas */}
      <div className="relative flex-1 w-full min-h-[175px]">
        <svg
          className="w-full h-full overflow-visible cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            {computedLines.map((line) => (
              <linearGradient key={`grad-${line.id}`} id={`hero-stepped-grad-${line.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={line.color} stopOpacity={line.isSelected ? 0.28 : 0.06} />
                <stop offset="100%" stopColor={line.color} stopOpacity="0.0" />
              </linearGradient>
            ))}
          </defs>

          {/* Dotted Horizontal Grid Lines */}
          {gridLevels.map((lvl) => {
            const y = chartMargin.top + (1 - lvl / 100) * plotHeight;
            return (
              <g key={`grid-${lvl}`}>
                <line
                  x1={chartMargin.left}
                  y1={y}
                  x2={chartMargin.left + plotWidth}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.05)"
                  strokeDasharray="2 4"
                  strokeWidth="1"
                />
                {/* Y-Axis Label on Right Side */}
                <text
                  x={chartMargin.left + plotWidth + 8}
                  y={y + 3.5}
                  fill="#64748B"
                  fontSize={10}
                  fontFamily="ui-monospace, monospace"
                  fontWeight={500}
                >
                  {lvl}%
                </text>
              </g>
            );
          })}

          {/* Area Fills */}
          {computedLines.map((line) => {
            if (!line.isSelected) return null;
            return (
              <path
                key={`area-${line.id}`}
                d={line.areaPath}
                fill={`url(#hero-stepped-grad-${line.id})`}
                className="transition-all duration-300 pointer-events-none"
              />
            );
          })}

          {/* Selected Outcome Dotted Threshold Guideline */}
          {computedLines.map((line) => {
            if (!line.isSelected) return null;
            return (
              <line
                key={`guide-${line.id}`}
                x1={chartMargin.left}
                y1={line.lastPt.y}
                x2={line.lastPt.x}
                y2={line.lastPt.y}
                stroke={line.color}
                strokeDasharray="3 3"
                strokeWidth="1"
                strokeOpacity="0.45"
                className="pointer-events-none"
              />
            );
          })}

          {/* Stepped Lines */}
          {computedLines.map((line) => {
            const isSel = line.isSelected;
            return (
              <g key={`line-${line.id}`}>
                <path
                  d={line.steppedPath}
                  fill="none"
                  stroke={line.color}
                  strokeWidth={isSel ? 2.2 : 1.4}
                  strokeOpacity={isSel ? 1 : 0.55}
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                  className="transition-all duration-150"
                />

                {/* Line Endpoint Dot */}
                <circle
                  cx={line.lastPt.x}
                  cy={line.lastPt.y}
                  r={isSel ? 4.5 : 3.5}
                  fill={line.color}
                  stroke="#0E1422"
                  strokeWidth={2}
                  className="transition-all duration-150"
                />

                {/* Pulsing Beacon for Active Line */}
                {isSel && (
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

          {/* Floating Callout Badges on the Chart Area */}
          {computedLines.map((line) => {
            const isSel = line.isSelected;
            const pt = hoverIndex !== null && line.points[hoverIndex] ? line.points[hoverIndex] : line.lastPt;
            const val = hoverIndex !== null && line.points[hoverIndex] ? line.points[hoverIndex].value : line.current;

            // Position callout badge cleanly near the line point
            const badgeW = 90;
            const badgeH = 20;
            const badgeX = Math.max(
              chartMargin.left + 10,
              Math.min(chartMargin.left + plotWidth - badgeW - 10, pt.x - badgeW - 12)
            );
            const badgeY = Math.max(
              chartMargin.top + 4,
              Math.min(chartMargin.top + plotHeight - badgeH - 4, pt.y - 10)
            );

            return (
              <g
                key={`callout-${line.id}`}
                onClick={() => onSelectOutcome?.(line.lineIdx)}
                className="cursor-pointer group"
              >
                {/* Floating Callout Box */}
                <rect
                  x={badgeX}
                  y={badgeY}
                  width={badgeW}
                  height={badgeH}
                  rx={5}
                  fill="#0B101B"
                  stroke={line.color}
                  strokeWidth={isSel ? 1.5 : 1}
                  strokeOpacity={isSel ? 0.9 : 0.4}
                  className="transition-all duration-150"
                />
                {/* Colored Indicator Line Inside Badge */}
                <line
                  x1={badgeX + 5}
                  y1={badgeY + 4}
                  x2={badgeX + 5}
                  y2={badgeY + badgeH - 4}
                  stroke={line.color}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
                {/* Text Label & Percentage */}
                <text
                  x={badgeX + 11}
                  y={badgeY + 14}
                  fill={isSel ? "#FFFFFF" : "#CBD5E1"}
                  fontSize={10.5}
                  fontWeight={isSel ? 700 : 600}
                  className="select-none pointer-events-none"
                >
                  <tspan>{line.label.slice(0, 7)}</tspan>
                  <tspan dx={4} fontWeight={800} fill={line.color}>
                    {val}%
                  </tspan>
                </text>
              </g>
            );
          })}

          {/* Crosshair Vertical Guide on Hover */}
          {hoverIndex !== null && computedLines[0]?.points[hoverIndex] && (
            <g>
              <line
                x1={computedLines[0].points[hoverIndex].x}
                y1={chartMargin.top}
                x2={computedLines[0].points[hoverIndex].x}
                y2={chartMargin.top + plotHeight}
                stroke="rgba(59, 130, 246, 0.4)"
                strokeDasharray="2 3"
                strokeWidth="1"
              />
              {computedLines.map((line) => {
                const p = line.points[hoverIndex];
                if (!p) return null;
                return (
                  <circle
                    key={`cross-pt-${line.id}`}
                    cx={p.x}
                    cy={p.y}
                    r={4}
                    fill={line.color}
                    stroke="#0E1422"
                    strokeWidth={2}
                  />
                );
              })}
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}

export default HeroTradingViewChart;
