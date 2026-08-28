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
    return (h >>> 0) / 4294967296;
  };
}

// Generate realistic Polymarket stepped price series
function generateSteppedSeries(
  targetPrice: number,
  count: number,
  seedKey: string,
): number[] {
  const prng = createPrng(seedKey);
  const volatility = 3.5;

  const startDrift = (prng() - 0.5) * volatility * 2.0;
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

    const jump = prng() < 0.12 ? (prng() - 0.5) * volatility * 2.0 : 0;
    const progress = i / (count - 1);
    const meanPull = (targetPrice - curr) * (0.06 + progress * 0.08);

    curr = Math.max(0.5, Math.min(99.5, curr + z * volatility * 0.35 + jump + meanPull));
    raw.push(Math.round(curr * 10) / 10);

    // Plateau hold for 2 to 4 intervals
    if (prng() < 0.45) {
      holdCount = Math.floor(prng() * 3) + 1;
    }
  }

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
  const [dimensions, setDimensions] = useState({ width: 440, height: 200 });
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const sampleCount = 60;

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

  // Generous margins with 28px bottom clearance ensuring bottom pills NEVER get clipped
  const chartMargin = { top: 8, bottom: 26, left: 6, right: 38 };
  const plotWidth = Math.max(10, dimensions.width - chartMargin.left - chartMargin.right);
  const plotHeight = Math.max(10, dimensions.height - chartMargin.top - chartMargin.bottom);

  // Generate synthetic timestamps
  const timestamps = useMemo(() => {
    const now = Date.now();
    const stepMs = 45 * 60 * 1000;
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

  // Calculate clean non-overlapping endpoint badge Y-positions on the right edge
  const endpointBadges = useMemo(() => {
    const sorted = [...computedLines].sort((a, b) => b.current - a.current);
    const minSpacing = 19;
    const placedY: number[] = [];

    return sorted.map((line) => {
      let idealY = line.lastPt.y;
      idealY = Math.max(chartMargin.top + 8, Math.min(chartMargin.top + plotHeight - 2, idealY));

      for (const py of placedY) {
        if (Math.abs(idealY - py) < minSpacing) {
          idealY = idealY < py ? py - minSpacing : py + minSpacing;
        }
      }
      idealY = Math.max(chartMargin.top + 8, Math.min(chartMargin.top + plotHeight - 2, idealY));
      placedY.push(idealY);

      return {
        ...line,
        badgeY: idealY,
      };
    });
  }, [computedLines, chartMargin, plotHeight]);

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

  // Selected item info for clean top-right display
  const activeLine = computedLines.find((l) => l.isSelected) || computedLines[0];

  // Grid percentage levels (0%, 25%, 50%, 75%, 100%)
  const gridLevels = [100, 75, 50, 25, 0];

  return (
    <div ref={containerRef} className="relative w-full h-full flex flex-col justify-between select-none overflow-hidden">
      {/* Top Header: Clean Non-Colliding Status Bar */}
      <div className="flex items-center justify-between px-1 mb-1 text-[11px] h-4 shrink-0">
        {/* Left: Active outcome indicator or simple live status */}
        <div className="flex items-center gap-1.5 text-slate-400">
          {activeLine && (
            <div className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: activeLine.color }}
              />
              <span className="font-semibold text-white truncate max-w-[140px]">
                {activeLine.label}
              </span>
              <span className="font-mono font-bold" style={{ color: activeLine.color }}>
                {hoverIndex !== null && activeLine.points[hoverIndex]
                  ? activeLine.points[hoverIndex].value
                  : activeLine.current}%
              </span>
            </div>
          )}
        </div>

        {/* Right: Clean date / time */}
        <div className="text-[10px] font-mono text-slate-500 shrink-0 font-medium">
          {currentHoverTime || (timestamps[timestamps.length - 1] ?? "")}
        </div>
      </div>

      {/* Main SVG TradingView Canvas */}
      <div className="relative flex-1 w-full overflow-hidden">
        <svg
          className="w-full h-full cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            {computedLines.map((line) => (
              <linearGradient key={`grad-${line.id}`} id={`hero-grad-v3-${line.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={line.color} stopOpacity={line.isSelected ? 0.25 : 0.04} />
                <stop offset="100%" stopColor={line.color} stopOpacity="0.0" />
              </linearGradient>
            ))}
          </defs>

          {/* Dotted Horizontal Gridlines & Y-Axis Scale */}
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
                  strokeDasharray="2 3"
                  strokeWidth="1"
                />
                <text
                  x={chartMargin.left + plotWidth + 6}
                  y={y + 3.5}
                  fill="#64748B"
                  fontSize={9.5}
                  fontFamily="ui-monospace, monospace"
                  fontWeight={500}
                >
                  {lvl}%
                </text>
              </g>
            );
          })}

          {/* Area Gradient for Active Line */}
          {computedLines.map((line) => {
            if (!line.isSelected) return null;
            return (
              <path
                key={`area-${line.id}`}
                d={line.areaPath}
                fill={`url(#hero-grad-v3-${line.id})`}
                className="transition-all duration-300 pointer-events-none"
              />
            );
          })}

          {/* Selected Line Dotted Guideline */}
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
                strokeOpacity="0.4"
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
                  strokeWidth={isSel ? 2 : 1.3}
                  strokeOpacity={isSel ? 1 : 0.5}
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                  className="transition-all duration-150"
                />

                {/* Endpoint Dot */}
                <circle
                  cx={line.lastPt.x}
                  cy={line.lastPt.y}
                  r={isSel ? 4 : 3}
                  fill={line.color}
                  stroke="#0E1422"
                  strokeWidth={2}
                  className="transition-all duration-150"
                />
                {isSel && (
                  <circle
                    cx={line.lastPt.x}
                    cy={line.lastPt.y}
                    r={6.5}
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

          {/* Clean Right-Edge Endpoint Badges (Cleanly spaced & perfectly unclipped) */}
          {endpointBadges.map((line) => {
            const isSel = line.isSelected;
            const badgeW = 34;
            const badgeH = 17;
            const badgeX = chartMargin.left + plotWidth - badgeW - 3;
            const badgeY = line.badgeY - badgeH / 2;

            return (
              <g
                key={`badge-clean-${line.id}`}
                onClick={() => onSelectOutcome?.(line.lineIdx)}
                className="cursor-pointer group"
              >
                <rect
                  x={badgeX}
                  y={badgeY}
                  width={badgeW}
                  height={badgeH}
                  rx={4}
                  fill="#0B101B"
                  stroke={line.color}
                  strokeWidth={isSel ? 1.5 : 1}
                  strokeOpacity={isSel ? 0.95 : 0.45}
                  className="transition-all duration-150 shadow-sm"
                />
                <text
                  x={badgeX + badgeW / 2}
                  y={badgeY + 11.5}
                  textAnchor="middle"
                  fill={isSel ? "#FFFFFF" : line.color}
                  fontSize={9.5}
                  fontWeight={isSel ? 800 : 700}
                  fontFamily="ui-monospace, monospace"
                  className="select-none pointer-events-none"
                >
                  {line.current}%
                </text>
              </g>
            );
          })}

          {/* Crosshair & Tooltip on Hover */}
          {hoverIndex !== null && computedLines[0]?.points[hoverIndex] && (
            <g>
              <line
                x1={computedLines[0].points[hoverIndex].x}
                y1={chartMargin.top}
                x2={computedLines[0].points[hoverIndex].x}
                y2={chartMargin.top + plotHeight}
                stroke="rgba(59, 130, 246, 0.45)"
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
                    r={3.5}
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
