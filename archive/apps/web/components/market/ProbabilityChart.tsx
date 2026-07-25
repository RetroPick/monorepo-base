import { memo, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MarketOutcome } from "@/types/market";
import type { ProbabilityHistoryPoint } from "@/lib/api/retropickApi";
import { cn } from "@/lib/utils";
import {
  appendSyntheticNowRow,
  applyEmaToRows,
  downsampleProbabilityRowsForDisplay,
  filterRowsByTimeWindow,
  historyToChartRows,
  isBinaryOutcomes,
  lastOutcomePercents,
  MULTI_OUTCOME_TOP_N,
  pickYesOutcome,
  presetSmoothingMode,
  presetToDurationMs,
  PROBABILITY_CHART_PRESET_LABEL,
  PROBABILITY_CHART_PRESETS,
  rowsToRechartsData,
  strokeColorsForProbabilityChart,
  takeRowsByIndices,
  windowDeltaPercent,
  type ProbabilityChartCurveType,
  type ProbabilityChartPreset,
  type RechartsProbabilityDatum,
} from "@/lib/market-probability-chart";
import { ChartLabelWatermark, type ChartLabelWatermarkVariant } from "@/components/market/ChartLabelWatermark";

/** Single-line binary chart stroke (cyan-500, aligned with timeframe chips). */
const BINARY_CHANCE_STROKE = "#06b6d4";

export type ProbabilityChartEpochMarkers = {
  /** Unix ms for active epoch lock time, if known and in range. */
  lockAtMs?: number;
  /** Unix ms for scheduled resolve time, if known and in range. */
  resolveAtMs?: number;
};

interface ProbabilityChartProps {
  outcomes: MarketOutcome[];
  /** Optional; kept for API compatibility with existing call sites. */
  volume?: string;
  history?: ProbabilityHistoryPoint[];
  /** When true, removes the inner card frame so the chart blends into the parent (e.g. FeaturedMarket) */
  embedded?: boolean;
  /** Vertical markers when timestamps fall inside the visible series domain (e.g. chain active epoch). */
  epochMarkers?: ProbabilityChartEpochMarkers;
  /** Upper-right branding; `portfolio` crops footer copy on the asset. Default: markets. */
  chartLabelVariant?: ChartLabelWatermarkVariant | "none";
}

function formatChartTime(ms: number) {
  return new Date(ms).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string; payload: RechartsProbabilityDatum }[];
}) => {
  if (!active || !payload?.length) {
    return null;
  }
  const t = payload[0].payload.t;
  const label = typeof t === "number" ? formatChartTime(t) : "";
  return (
    <div className="bg-background/80 backdrop-blur-xl border border-border/50 p-4 rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
      <p className="text-xs text-muted-foreground font-mono mb-2">{label}</p>
      <div className="space-y-1.5">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]"
              style={{ backgroundColor: entry.color, color: entry.color }}
            />
            <span className="font-medium text-foreground">{entry.name}:</span>
            <span className="font-bold font-mono" style={{ color: entry.color }}>
              {Math.round(entry.value)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ProbabilityChart = memo(function ProbabilityChart({
  outcomes,
  history = [],
  embedded = false,
  epochMarkers,
  chartLabelVariant = "markets",
}: ProbabilityChartProps) {
  const [preset, setPreset] = useState<ProbabilityChartPreset>("all");
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    setNowMs(Date.now());
  }, [history]);

  useEffect(() => {
    const id = window.setInterval(
      () => {
        setNowMs(Date.now());
      },
      20_000,
    );
    return () => window.clearInterval(id);
  }, []);

  const { data, topOutcomes, seriesColors, legendPercents, isBinary, chanceDeltaPct, curveType } = useMemo(() => {
    const smoothing = presetSmoothingMode(preset);
    const curveType: ProbabilityChartCurveType = smoothing.curve;
    const isBinary = isBinaryOutcomes(outcomes);
    const sortedOutcomes = isBinary
      ? [pickYesOutcome(outcomes)]
      : [...outcomes].sort((a, b) => b.probability - a.probability).slice(0, MULTI_OUTCOME_TOP_N);
    const colors = isBinary
      ? [BINARY_CHANCE_STROKE]
      : strokeColorsForProbabilityChart(outcomes, sortedOutcomes);
    const sortedIds = sortedOutcomes.map((o) => String(o.id));
    const fallbackPercents: Record<string, number> = {};
    sortedOutcomes.forEach((o) => {
      fallbackPercents[String(o.id)] = Math.max(0, Math.min(100, o.probability));
    });

    const fullRows = historyToChartRows(history, sortedIds);
    const windowMs = presetToDurationMs(preset);
    const idx = filterRowsByTimeWindow(fullRows, nowMs, windowMs);
    const windowed = takeRowsByIndices(fullRows, idx);
    const displayRows = downsampleProbabilityRowsForDisplay(windowed, sortedIds, {
      minBucketMs: smoothing.minBucketMs,
      maxBuckets: smoothing.maxBuckets,
    });
    const yesIdForDelta = isBinary ? String(pickYesOutcome(outcomes).id) : sortedIds[0] ?? "0";
    const chanceDeltaPct = isBinary ? windowDeltaPercent(displayRows, yesIdForDelta) : 0;
    const emaRows =
      smoothing.ema != null && displayRows.length > 0
        ? applyEmaToRows(displayRows, sortedIds, smoothing.ema.alpha)
        : displayRows;
    const baseFallback = lastOutcomePercents(fullRows, sortedIds, fallbackPercents);
    const withLive = appendSyntheticNowRow(emaRows, sortedIds, nowMs, baseFallback, {
      liveImpliedPercents: baseFallback,
    });
    const data = rowsToRechartsData(withLive, sortedIds);

    if (history.length === 0) {
      const row: RechartsProbabilityDatum = { t: nowMs, isSyntheticNow: true };
      sortedIds.forEach((id) => {
        row[`outcome_${id}`] = fallbackPercents[id] ?? 0;
      });
      const legendPercents = sortedIds.map((id) => fallbackPercents[id] ?? 0);
      return {
        data: [row],
        topOutcomes: sortedOutcomes,
        seriesColors: colors,
        legendPercents,
        isBinary,
        chanceDeltaPct: 0,
        curveType,
      };
    }

    const last = data[data.length - 1];
    const legendPercents = sortedIds.map((id) => {
      const v = last?.[`outcome_${id}`];
      return typeof v === "number" ? v : fallbackPercents[id] ?? 0;
    });
    return { data, topOutcomes: sortedOutcomes, seriesColors: colors, legendPercents, isBinary, chanceDeltaPct, curveType };
  }, [history, nowMs, outcomes, preset]);

  const lastIndex = Math.max(0, data.length - 1);
  const timeDomainMin = typeof data[0]?.t === "number" ? (data[0].t as number) : nowMs;
  const timeDomainMax =
    typeof data[lastIndex]?.t === "number" ? (data[lastIndex].t as number) : nowMs;

  const markerInDomain = (ms: number | undefined) =>
    ms != null && Number.isFinite(ms) && ms >= timeDomainMin && ms <= timeDomainMax;

  const showLockLine = markerInDomain(epochMarkers?.lockAtMs);
  const showResolveLine = markerInDomain(epochMarkers?.resolveAtMs);

  return (
    <div
      className={cn(
        embedded ? "p-0" : "p-6 rounded-2xl border border-border/50 bg-card shadow-sm transition-shadow duration-200 md:hover:shadow-md",
      )}
    >
      <div
        className={cn(
          "flex flex-col justify-between gap-4 sm:flex-row sm:items-center",
          embedded ? "mb-3 gap-3" : "mb-6 gap-4",
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <p className="text-[10px] font-medium normal-case tracking-normal text-muted-foreground">
            Pool-implied probability
          </p>
          {isBinary ? (
            <h2 className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-2xl font-semibold tracking-tight text-foreground">
              <span className="text-cyan-600 tabular-nums dark:text-cyan-400">
                {Math.round(legendPercents[0] ?? 0)}% chance
              </span>
              {chanceDeltaPct !== 0 ? (
                <span
                  className={cn(
                    "text-sm font-medium tabular-nums",
                    chanceDeltaPct > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400",
                  )}
                >
                  {chanceDeltaPct > 0 ? "▲" : "▼"} {Math.abs(chanceDeltaPct)}%
                </span>
              ) : null}
            </h2>
          ) : (
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-bold uppercase tracking-wider">
              {topOutcomes.map((outcome, i) => (
                <div key={outcome.id} className="group flex cursor-default items-center gap-2">
                  <div className="size-2 shrink-0 rounded-full" style={{ backgroundColor: seriesColors[i] }} />
                  <span className="text-muted-foreground">{outcome.label}</span>
                  <span
                    className="font-mono text-[11px] font-semibold tabular-nums normal-case tracking-normal"
                    style={{ color: seriesColors[i] }}
                  >
                    {Math.round(legendPercents[i] ?? 0)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="relative h-[300px] w-full bg-transparent">
        <ResponsiveContainer width="100%" height="100%" debounce={32} className="relative z-0">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 4, bottom: 4 }} style={{ background: "transparent" }}>
            <defs>
              {topOutcomes.map((outcome, i) => (
                <linearGradient key={`gradient-${outcome.id}`} id={`gradient-${outcome.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={seriesColors[i]} stopOpacity={0.12} />
                  <stop offset="95%" stopColor={seriesColors[i]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="hsl(var(--border))"
              strokeOpacity={0.45}
            />
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "#888" }}
              minTickGap={28}
              dy={10}
              tickFormatter={(v) => (typeof v === "number" ? formatChartTime(v) : String(v))}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 10, fill: "#888" }}
              domain={[0, 100]}
              dx={-10}
            />
            <Tooltip content={<CustomTooltip />} />
            {showLockLine && epochMarkers?.lockAtMs != null ? (
              <ReferenceLine
                x={epochMarkers.lockAtMs}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="4 4"
                strokeOpacity={0.85}
                label={{
                  value: "Lock",
                  position: "top",
                  fill: "hsl(var(--muted-foreground))",
                  fontSize: 10,
                }}
              />
            ) : null}
            {showResolveLine && epochMarkers?.resolveAtMs != null ? (
              <ReferenceLine
                x={epochMarkers.resolveAtMs}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="2 6"
                strokeOpacity={0.75}
                label={{
                  value: "Resolve",
                  position: "top",
                  fill: "hsl(var(--muted-foreground))",
                  fontSize: 10,
                }}
              />
            ) : null}
            {topOutcomes.map((outcome, i) => {
              const color = seriesColors[i];
              return (
                <Area
                  key={outcome.id}
                  type={curveType}
                  dataKey={`outcome_${outcome.id}`}
                  stroke={color}
                  fill={`url(#gradient-${outcome.id})`}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  name={outcome.label}
                  isAnimationActive={false}
                  dot={(dotProps) => {
                    const { cx, cy, index, stroke } = dotProps;
                    if (index !== lastIndex || cx == null || cy == null) {
                      return null;
                    }
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={4}
                        fill={stroke}
                        stroke="var(--background)"
                        strokeWidth={1.5}
                        style={{ filter: `drop-shadow(0 0 6px ${color}66)` }}
                      />
                    );
                  }}
                  activeDot={{ r: 5 }}
                />
              );
            })}
          </AreaChart>
        </ResponsiveContainer>
        {chartLabelVariant !== "none" ? (
          <ChartLabelWatermark
            variant={chartLabelVariant}
            className={cn("absolute right-2 top-2 z-20 sm:right-3 sm:top-3", embedded && "origin-top-right scale-[0.92]")}
          />
        ) : null}
      </div>

      <div className={cn("mt-3 flex justify-end", embedded && "mt-2")}>
        <div
          className="flex flex-wrap gap-1 rounded-lg border border-border/60 bg-muted/30 p-1"
          role="tablist"
          aria-label="Probability time range"
        >
          {PROBABILITY_CHART_PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={preset === p}
              className={cn(
                "rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors",
                preset === p
                  ? "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 ring-1 ring-cyan-500/40"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setPreset(p)}
            >
              {PROBABILITY_CHART_PRESET_LABEL[p]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});

export default ProbabilityChart;
