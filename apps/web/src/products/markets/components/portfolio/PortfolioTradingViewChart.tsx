"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import {
  createChart,
  AreaSeries,
  ColorType,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";
import { cn } from "@/shared/lib/utils";

interface PortfolioTradingViewChartProps {
  timeframe: "all" | "30d" | "7d";
  currentValue?: number;
}

export function PortfolioTradingViewChart({
  timeframe,
  currentValue = 0,
}: PortfolioTradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<any> | null>(null);

  const [hoveredValue, setHoveredValue] = useState<{
    price: number | null;
    time: string | null;
  }>({ price: null, time: null });

  // Generate clean time-series data for portfolio exposure
  const chartData = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    const count = timeframe === "7d" ? 28 : timeframe === "30d" ? 60 : 90;
    const stepSeconds =
      timeframe === "7d" ? 21600 : timeframe === "30d" ? 43200 : 86400; // 6h / 12h / 24h
    const startTime = now - count * stepSeconds;

    const data: { time: Time; value: number }[] = [];
    let base = currentValue;

    for (let i = 0; i < count; i++) {
      const t = (startTime + i * stepSeconds) as Time;
      // Flat baseline or slight historical growth
      const val = currentValue === 0 ? 0 : Math.max(0, base + (i - count) * 0.5);
      data.push({ time: t, value: val });
    }

    return data;
  }, [timeframe, currentValue]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      seriesRef.current = null;
    }

    const container = chartContainerRef.current;
    const width = container.clientWidth || 480;
    const height = 180;

    const chart = createChart(container, {
      width,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#64748B",
        fontSize: 10,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: {
          color: "rgba(255, 255, 255, 0.04)",
          style: LineStyle.Dashed,
        },
      },
      crosshair: {
        vertLine: {
          color: "#10B981",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#10B981",
        },
        horzLine: {
          color: "#10B981",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#10B981",
        },
      },
      rightPriceScale: {
        borderColor: "rgba(255, 255, 255, 0.06)",
        scaleMargins: { top: 0.2, bottom: 0.1 },
        autoScale: true,
      },
      timeScale: {
        borderColor: "rgba(255, 255, 255, 0.06)",
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: false,
      handleScale: false,
    });

    chartRef.current = chart;

    const opts = {
      lineColor: "#10B981",
      topColor: "rgba(16, 185, 129, 0.25)",
      bottomColor: "rgba(16, 185, 129, 0.0)",
      lineWidth: 2.5,
      priceFormat: {
        type: "custom" as const,
        formatter: (p: number) => `$${p.toFixed(2)}`,
      },
    };

    const areaSeries = (chart as any).addSeries
      ? (chart as any).addSeries(AreaSeries, opts)
      : (chart as any).addAreaSeries(opts);

    if (areaSeries) {
      areaSeries.setData(chartData);
      seriesRef.current = areaSeries;
    }

    chart.timeScale().fitContent();

    chart.subscribeCrosshairMove((param) => {
      if (
        !param.point ||
        param.point.x < 0 ||
        param.point.x > container.clientWidth ||
        param.point.y < 0 ||
        param.point.y > height
      ) {
        setHoveredValue({ price: null, time: null });
        return;
      }

      let timeStr: string | null = null;
      if (param.time) {
        const d = new Date((param.time as number) * 1000);
        timeStr = d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
        });
      }

      let priceVal: number | null = null;
      if (param.seriesData && param.seriesData.size > 0) {
        const entry = Array.from(param.seriesData.values())[0] as any;
        if (entry && typeof entry.value === "number") {
          priceVal = entry.value;
        }
      }

      setHoveredValue({ price: priceVal, time: timeStr });
    });

    // Instantly remove any injected TradingView logo / watermark nodes
    const cleanLogos = () => {
      container
        .querySelectorAll(
          'a[href*="tradingview"], div[class*="attribution"], div[id*="tv-attr-logo"], #tv-attr-logo, .tv-attr-logo, .tv-watermark',
        )
        .forEach((el) => el.remove());
    };
    cleanLogos();
    const logoObserver = new MutationObserver(() => cleanLogos());
    logoObserver.observe(container, { childList: true, subtree: true });

    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length > 0 && chartRef.current) {
        chartRef.current.applyOptions({ width: entries[0].contentRect.width });
        chartRef.current.timeScale().fitContent();
      }
    });

    resizeObserver.observe(container);

    return () => {
      logoObserver.disconnect();
      resizeObserver.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
      }
    };
  }, [chartData]);

  return (
    <div className="relative w-full">
      {/* Live hover badge overlay */}
      {hoveredValue.price !== null && (
        <div className="absolute left-2 top-2 z-10 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-[#0E1424]/90 px-2.5 py-1 text-xs font-mono backdrop-blur-md">
          <span className="font-bold text-emerald-400">
            ${hoveredValue.price.toFixed(2)}
          </span>
          {hoveredValue.time && (
            <span className="text-slate-400 font-medium">· {hoveredValue.time}</span>
          )}
        </div>
      )}

      {/* Chart Canvas */}
      <div className="h-[180px] w-full" ref={chartContainerRef} />
    </div>
  );
}

export default PortfolioTradingViewChart;
