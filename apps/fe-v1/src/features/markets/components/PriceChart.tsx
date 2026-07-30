import { useEffect, useRef } from "react";
import { createChart, LineSeries, type IChartApi, type LineData, type UTCTimestamp } from "lightweight-charts";
import type { PriceHistoryResponse } from "@retropick/polymarket";

import { formatPrice } from "../lib/decimal";

interface PriceChartProps {
  history?: PriceHistoryResponse;
  isLoading?: boolean;
}

function toChartPoints(history: PriceHistoryResponse): LineData<UTCTimestamp>[] {
  return history.points.map((p) => ({
    time: (Math.floor(new Date(p.timestamp).getTime() / 1000) as UTCTimestamp),
    value: Number(p.price),
  }));
}

export function PriceChart({ history, isLoading }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ReturnType<IChartApi["addSeries"]> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      height: 220,
      layout: { background: { color: "transparent" }, textColor: "#94a3b8" },
      grid: { vertLines: { visible: false }, horzLines: { color: "#1e293b" } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false },
    });
    const series = chart.addSeries(LineSeries, { color: "#2dd4bf", lineWidth: 2 });
    chartRef.current = chart;
    seriesRef.current = series;

    const observer = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current || !history) return;
    const points = toChartPoints(history);
    seriesRef.current.setData(points);
    chartRef.current?.timeScale().fitContent();
  }, [history]);

  const lastPrice = history?.points.at(-1)?.price;

  return (
    <section aria-label="Price history chart">
      {isLoading && !history ? (
        <p className="text-sm text-muted-foreground">Loading chart…</p>
      ) : null}
      {!isLoading && history && history.points.length === 0 ? (
        <p className="text-sm text-muted-foreground" role="status">
          No price history available for this interval.
        </p>
      ) : null}
      {lastPrice ? (
        <p className="sr-only">
          Latest price {formatPrice(lastPrice)} from {history?.points.length ?? 0} points. Gaps are not
          forward-filled.
        </p>
      ) : null}
      <div ref={containerRef} className="w-full min-h-[220px]" />
    </section>
  );
}
