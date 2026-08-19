import { useEffect, useRef, useState, useMemo } from "react";
import {
  createChart,
  AreaSeries,
  LineSeries,
  ColorType,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";
import { cn } from "@/shared/lib/utils";
import { TrendingUp, TrendingDown, Clock, Award, ChevronDown, Sparkles } from "lucide-react";
import type { TradeOption } from "./PolymarketTradeBox";

interface TradingViewMarketChartProps {
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

const OUTCOME_COLORS = [
  { line: "#3B82F6", top: "rgba(59, 130, 246, 0.25)", bottom: "rgba(59, 130, 246, 0.0)" },
  { line: "#60A5FA", top: "rgba(96, 165, 250, 0.25)", bottom: "rgba(96, 165, 250, 0.0)" },
  { line: "#F59E0B", top: "rgba(245, 158, 11, 0.25)", bottom: "rgba(245, 158, 11, 0.0)" },
  { line: "#F97316", top: "rgba(249, 115, 22, 0.25)", bottom: "rgba(249, 115, 22, 0.0)" },
  { line: "#10B981", top: "rgba(16, 185, 129, 0.25)", bottom: "rgba(16, 185, 129, 0.0)" },
  { line: "#EC4899", top: "rgba(236, 72, 153, 0.25)", bottom: "rgba(236, 72, 153, 0.0)" },
];

export function TradingViewMarketChart({
  initialProbYes = 41,
  marketTitle = "Market",
  category = "Crypto",
  volume = "$16,581,088 Vol.",
  endDate = "Dec 31, 2026",
  options,
  selectedOptionIdx = 0,
  onSelectOption,
}: TradingViewMarketChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const [timeframe, setTimeframe] = useState<Timeframe>("ALL");
  const [hoveredPrice, setHoveredPrice] = useState<number | null>(null);
  const [hoveredTime, setHoveredTime] = useState<string | null>(null);

  const isMultiOutcome = Boolean(options && options.length >= 2);
  const isMeetingDates =
    isMultiOutcome &&
    options?.some(
      (o) =>
        o.label.includes("Sep") ||
        o.label.includes("Aug") ||
        o.label.includes("Oct") ||
        o.label.includes("bps"),
    );

  // Generate realistic historical time-series data matching timeframe
  const chartDataSeries = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    const count =
      timeframe === "1H"
        ? 60
        : timeframe === "6H"
          ? 72
          : timeframe === "1D"
            ? 96
            : timeframe === "1W"
              ? 112
              : timeframe === "1M"
                ? 120
                : 150;

    const stepSeconds =
      timeframe === "1H"
        ? 60
        : timeframe === "6H"
          ? 300
          : timeframe === "1D"
            ? 900
            : timeframe === "1W"
              ? 3600
              : timeframe === "1M"
                ? 14400
                : 86400;

    const startTime = now - count * stepSeconds;

    if (isMultiOutcome && options) {
      return options.map((opt, optIdx) => {
        const base = opt.percentage;
        const colorConfig = OUTCOME_COLORS[optIdx % OUTCOME_COLORS.length];
        const data: { time: Time; value: number }[] = [];

        let curr = Math.max(1, base - (optIdx === 0 ? 18 : -10));
        for (let i = 0; i < count; i++) {
          const t = (startTime + i * stepSeconds) as Time;
          const wave = Math.sin(i * 0.18 + optIdx * 1.7) * (optIdx === 0 ? 6 : 3.5);
          const noise = ((i % 4 === 0 ? 1 : -1) * (optIdx === 0 ? 2 : 1)) * Math.random();
          curr = Math.min(99, Math.max(0.5, curr + wave * 0.4 + noise));

          const finalVal = i === count - 1 ? base : Math.round(curr * 10) / 10;
          data.push({ time: t, value: finalVal });
        }

        return {
          label: opt.label,
          percentage: opt.percentage,
          color: colorConfig.line,
          topColor: colorConfig.top,
          bottomColor: colorConfig.bottom,
          data,
        };
      });
    }

    // Single Binary YES Series
    const base = initialProbYes;
    const data: { time: Time; value: number }[] = [];
    let curr = Math.max(5, base - 12);

    for (let i = 0; i < count; i++) {
      const t = (startTime + i * stepSeconds) as Time;
      const wave = Math.sin(i * 0.15) * 5.5 + (i % 3 === 0 ? 1.5 : -1.5) * Math.random();
      curr = Math.min(98, Math.max(2, curr + wave * 0.45));

      const finalVal = i === count - 1 ? base : Math.round(curr * 10) / 10;
      data.push({ time: t, value: finalVal });
    }

    return [
      {
        label: "YES",
        percentage: base,
        color: OUTCOME_COLORS[0].line,
        topColor: OUTCOME_COLORS[0].top,
        bottomColor: OUTCOME_COLORS[0].bottom,
        data,
      },
    ];
  }, [options, isMultiOutcome, initialProbYes, timeframe]);

  // Active series
  const activeSeries = chartDataSeries[selectedOptionIdx] || chartDataSeries[0];
  const latestPrice = activeSeries.data[activeSeries.data.length - 1]?.value ?? activeSeries.percentage;
  const firstPrice = activeSeries.data[0]?.value ?? latestPrice;
  const currentPrice = hoveredPrice !== null ? hoveredPrice : latestPrice;
  const priceChange = Math.round((currentPrice - firstPrice) * 10) / 10;
  const isPositive = priceChange >= 0;

  // Initialize and Render TradingView Lightweight Charts
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Clear previous chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const container = chartContainerRef.current;
    const width = container.clientWidth || 640;
    const height = 240;

    const chart = createChart(container, {
      width,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#64748B",
        fontSize: 11,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: "rgba(255, 255, 255, 0.05)", style: LineStyle.Dashed },
      },
      crosshair: {
        vertLine: {
          color: "#3B82F6",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#1E293B",
        },
        horzLine: {
          color: "#3B82F6",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#1E293B",
        },
      },
      rightPriceScale: {
        borderColor: "rgba(255, 255, 255, 0.08)",
        scaleMargins: { top: 0.12, bottom: 0.12 },
        autoScale: true,
      },
      timeScale: {
        borderColor: "rgba(255, 255, 255, 0.08)",
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: false,
      handleScale: false,
    });

    chartRef.current = chart;

    // Add Area or Line Series with universal v4/v5 support
    if (isMultiOutcome) {
      chartDataSeries.forEach((s, idx) => {
        const isSelected = selectedOptionIdx === idx;
        const opts = {
          color: s.color,
          lineWidth: isSelected ? 3 : 2,
          priceFormat: {
            type: "custom" as const,
            formatter: (p: number) => `${p.toFixed(0)}¢`,
          },
        };
        const lineSeries =
          typeof (chart as any).addSeries === "function" && LineSeries
            ? (chart as any).addSeries(LineSeries, opts)
            : typeof (chart as any).addLineSeries === "function"
              ? (chart as any).addLineSeries(opts)
              : null;
        if (lineSeries) lineSeries.setData(s.data);
      });
    } else {
      const opts = {
        lineColor: activeSeries.color,
        topColor: activeSeries.topColor,
        bottomColor: activeSeries.bottomColor,
        lineWidth: 2.5,
        priceFormat: {
          type: "custom" as const,
          formatter: (p: number) => `${p.toFixed(0)}¢`,
        },
      };
      const areaSeries =
        typeof (chart as any).addSeries === "function" && AreaSeries
          ? (chart as any).addSeries(AreaSeries, opts)
          : typeof (chart as any).addAreaSeries === "function"
            ? (chart as any).addAreaSeries(opts)
            : null;
      if (areaSeries) areaSeries.setData(activeSeries.data);
    }

    chart.timeScale().fitContent();

    // Crosshair Sync
    chart.subscribeCrosshairMove((param) => {
      if (
        !param.point ||
        param.point.x < 0 ||
        param.point.x > container.clientWidth ||
        param.point.y < 0 ||
        param.point.y > height
      ) {
        setHoveredPrice(null);
        setHoveredTime(null);
        return;
      }

      if (param.time) {
        const d = new Date((param.time as number) * 1000);
        setHoveredTime(
          d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          }),
        );
      }

      const seriesPrices = param.seriesData;
      if (seriesPrices.size > 0) {
        const firstEntry = Array.from(seriesPrices.values())[0] as any;
        if (firstEntry && typeof firstEntry.value === "number") {
          setHoveredPrice(Math.round(firstEntry.value * 10) / 10);
        }
      }
    });

    // Resize Handler
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length > 0 && chartRef.current) {
        chartRef.current.applyOptions({ width: entries[0].contentRect.width });
        chartRef.current.timeScale().fitContent();
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [chartDataSeries, isMultiOutcome, selectedOptionIdx, activeSeries]);

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
              <span className="text-slate-300 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-blue-400" />
                TradingView Engine
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="font-mono text-3xl font-black text-white">
                {currentPrice < 1 ? "0.4¢" : `${currentPrice}¢`}
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
              {hoveredTime && (
                <span className="font-mono text-xs font-semibold text-slate-400">
                  · {hoveredTime}
                </span>
              )}
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
          {chartDataSeries.map((s, idx) => {
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

      {/* TradingView 60FPS Canvas Chart Container */}
      <div className="relative w-full overflow-hidden rounded-xl bg-[#080D18]/50 p-2 border border-white/[0.04]">
        <div ref={chartContainerRef} className="h-[240px] w-full" />
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
