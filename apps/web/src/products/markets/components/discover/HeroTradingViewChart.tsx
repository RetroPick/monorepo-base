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

interface OutcomeSlideData {
  outcomes?: {
    label: string;
    percentage: number;
    color: string;
    history: number[];
  }[];
}

interface HeroTradingViewChartProps {
  isLiveSports: boolean;
  sportsData?: SportsSlideData;
  outcomeData?: OutcomeSlideData;
  selectedOutcomeIdx?: number;
  onSelectOutcome?: (idx: number) => void;
  activeTeamTab?: "team1" | "team2";
}

// Generate smooth cubic bezier SVG path from points
function getSmoothSplinePath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`;

  let d = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;

    const cp1x = p1.x + (p2.x - p0.x) / 4.5;
    const cp1y = p1.y + (p2.y - p0.y) / 4.5;
    const cp2x = p2.x - (p3.x - p1.x) / 4.5;
    const cp2y = p2.y - (p3.y - p1.y) / 4.5;

    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
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
  const [dimensions, setDimensions] = useState({ width: 420, height: 185 });
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Measure container dimensions reactively
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

  const chartMargin = { top: 16, bottom: 20, left: 10, right: 54 };
  const plotWidth = Math.max(10, dimensions.width - chartMargin.left - chartMargin.right);
  const plotHeight = Math.max(10, dimensions.height - chartMargin.top - chartMargin.bottom);

  // Normalize outcomes / lines data
  const lines = useMemo(() => {
    if (isLiveSports && sportsData) {
      const h1 = sportsData.historyTeam1 || [55, 60, 65, 75, 85, 92, 95];
      const h2 = sportsData.historyTeam2 || [45, 40, 35, 25, 15, 8, 6];
      return [
        {
          id: "team1",
          label: sportsData.team1.name,
          color: sportsData.team1.color || "#3B82F6",
          current: sportsData.team1.prob,
          history: h1,
          isSelected: selectedOutcomeIdx === 0,
        },
        {
          id: "team2",
          label: sportsData.team2.name,
          color: sportsData.team2.color || "#A855F7",
          current: sportsData.team2.prob,
          history: h2,
          isSelected: selectedOutcomeIdx === 1,
        },
      ];
    }

    if (outcomeData?.outcomes && outcomeData.outcomes.length > 0) {
      return outcomeData.outcomes.map((out, idx) => ({
        id: `outcome-${idx}`,
        label: out.label,
        color: out.color || "#3B82F6",
        current: out.percentage,
        history: out.history && out.history.length > 0 ? out.history : [out.percentage * 0.8, out.percentage * 0.9, out.percentage],
        isSelected: selectedOutcomeIdx === idx,
      }));
    }

    return [];
  }, [isLiveSports, sportsData, outcomeData, selectedOutcomeIdx]);

  // Compute coordinate paths
  const computedLines = useMemo(() => {
    return lines.map((line, lineIdx) => {
      const dataLen = line.history.length;
      const points = line.history.map((val, i) => {
        const x = chartMargin.left + (i / Math.max(1, dataLen - 1)) * plotWidth;
        // Clamped 0-100% to Y axis
        const normY = Math.max(0, Math.min(100, val)) / 100;
        const y = chartMargin.top + (1 - normY) * plotHeight;
        return { x, y, value: val };
      });

      const splinePath = getSmoothSplinePath(points);
      const lastPt = points[points.length - 1] || { x: chartMargin.left + plotWidth, y: chartMargin.top + plotHeight / 2 };
      const firstPt = points[0] || { x: chartMargin.left, y: chartMargin.top + plotHeight };
      const areaPath = `${splinePath} L ${lastPt.x.toFixed(1)},${(chartMargin.top + plotHeight).toFixed(1)} L ${firstPt.x.toFixed(1)},${(chartMargin.top + plotHeight).toFixed(1)} Z`;

      return {
        ...line,
        points,
        splinePath,
        areaPath,
        lastPt,
        lineIdx,
      };
    });
  }, [lines, plotWidth, plotHeight, chartMargin]);

  // Handle mouse interaction for crosshair
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - chartMargin.left;
    const ratio = Math.max(0, Math.min(1, mouseX / plotWidth));
    const sampleLen = computedLines[0]?.history.length || 8;
    const idx = Math.round(ratio * (sampleLen - 1));
    setHoverIndex(idx);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  // Grid percentage levels (0%, 25%, 50%, 75%, 100%)
  const gridLevels = [100, 75, 50, 25, 0];

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[185px] flex items-center select-none">
      <svg
        className="w-full h-full overflow-visible"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          {computedLines.map((line) => (
            <linearGradient key={`grad-${line.id}`} id={`hero-grad-${line.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={line.color} stopOpacity={line.isSelected ? 0.32 : 0.08} />
              <stop offset="100%" stopColor={line.color} stopOpacity="0.0" />
            </linearGradient>
          ))}
          {/* Subtle Glow Filter */}
          <filter id="hero-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Horizontal Dotted Gridlines */}
        {gridLevels.map((lvl) => {
          const y = chartMargin.top + (1 - lvl / 100) * plotHeight;
          return (
            <g key={`grid-${lvl}`}>
              <line
                x1={chartMargin.left}
                y1={y}
                x2={chartMargin.left + plotWidth}
                y2={y}
                stroke="rgba(255, 255, 255, 0.06)"
                strokeDasharray="3 4"
                strokeWidth="1"
              />
            </g>
          );
        })}

        {/* Area Gradient Fills */}
        {computedLines.map((line) => {
          if (!line.isSelected) return null;
          return (
            <path
              key={`area-${line.id}`}
              d={line.areaPath}
              fill={`url(#hero-grad-${line.id})`}
              className="transition-all duration-300 pointer-events-none"
            />
          );
        })}

        {/* Spline Lines */}
        {computedLines.map((line) => {
          const strokeWidth = line.isSelected ? 2.5 : 1.6;
          const strokeOpacity = line.isSelected ? 1 : 0.45;

          return (
            <g key={`line-${line.id}`}>
              <path
                d={line.splinePath}
                fill="none"
                stroke={line.color}
                strokeWidth={strokeWidth}
                strokeOpacity={strokeOpacity}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-200"
              />

              {/* Endpoint Glowing Live Beacon */}
              <circle
                cx={line.lastPt.x}
                cy={line.lastPt.y}
                r={line.isSelected ? 4 : 3}
                fill={line.color}
                stroke="#0E1422"
                strokeWidth={2}
                className="transition-all duration-200"
              />
              {line.isSelected && (
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

        {/* Hover Crosshair & Data Tooltip */}
        {hoverIndex !== null && computedLines[0]?.points[hoverIndex] && (
          <g>
            <line
              x1={computedLines[0].points[hoverIndex].x}
              y1={chartMargin.top}
              x2={computedLines[0].points[hoverIndex].x}
              y2={chartMargin.top + plotHeight}
              stroke="rgba(255, 255, 255, 0.2)"
              strokeDasharray="2 3"
              strokeWidth="1"
            />
            {computedLines.map((line) => {
              const pt = line.points[hoverIndex];
              if (!pt) return null;
              return (
                <circle
                  key={`hover-pt-${line.id}`}
                  cx={pt.x}
                  cy={pt.y}
                  r={line.isSelected ? 4.5 : 3.5}
                  fill={line.color}
                  stroke="#0E1422"
                  strokeWidth="2"
                />
              );
            })}
          </g>
        )}

        {/* Right Margin Percentage Badges (Clean, non-colliding & aligned) */}
        {computedLines.map((line) => {
          const badgeY = Math.max(
            chartMargin.top + 6,
            Math.min(chartMargin.top + plotHeight - 6, line.lastPt.y)
          );
          const badgeX = chartMargin.left + plotWidth + 6;

          return (
            <g
              key={`badge-${line.id}`}
              onClick={() => onSelectOutcome?.(line.lineIdx)}
              className="cursor-pointer group"
            >
              {/* Badge Background Pill */}
              <rect
                x={badgeX}
                y={badgeY - 10}
                width={42}
                height={20}
                rx={6}
                fill={line.color}
                fillOpacity={line.isSelected ? 0.95 : 0.2}
                className="transition-all duration-200"
              />
              {/* Badge Percentage Text */}
              <text
                x={badgeX + 21}
                y={badgeY + 4}
                textAnchor="middle"
                fill={line.isSelected ? "#FFFFFF" : line.color}
                fontSize={11}
                fontWeight={line.isSelected ? 800 : 700}
                fontFamily="ui-monospace, monospace"
                className="select-none pointer-events-none"
              >
                {line.current}%
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default HeroTradingViewChart;
