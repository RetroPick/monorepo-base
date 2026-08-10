import { useEffect, useMemo, useRef } from "react";
import { ColorType, createChart, CrosshairMode, LineSeries } from "lightweight-charts";

import { ChartLabelWatermark } from "@/components/market/ChartLabelWatermark";
import type { LinePoint } from "@/lib/market-data/types";

export interface LineChartPriceLine {
  price: number;
  title: string;
  color: string;
}

interface LineChartPanelProps {
  points: LinePoint[];
  height?: number;
  /** Kept for call-site compatibility; header chrome is not rendered. */
  title?: string;
  subtitle?: string;
  sourceLine?: string;
  formatValue?: (n: number) => string;
  /** Horizontal reference lines (e.g. threshold) on the price scale. */
  priceLines?: LineChartPriceLine[];
}

function getChartColors() {
  const styles = getComputedStyle(document.documentElement);
  const mutedToken = styles.getPropertyValue("--muted-foreground").trim();

  return {
    surface: `hsl(${styles.getPropertyValue("--background").trim()})`,
    muted: `hsl(${mutedToken})`,
    line: `hsl(${styles.getPropertyValue("--accent-cyan").trim()})`,
  };
}

export function LineChartPanel({
  points,
  height = 320,
  formatValue = (n) => n.toLocaleString(undefined, { maximumFractionDigits: 2 }),
  priceLines = [],
}: LineChartPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const priceLinesKey = useMemo(
    () => priceLines.map((l) => `${l.price}:${l.title}:${l.color}`).join("|"),
    [priceLines],
  );

  useEffect(() => {
    const container = containerRef.current;
    const wrapper = wrapperRef.current;
    if (!container || !wrapper || points.length === 0) return;

    const applyTheme = () => {
      const colors = getChartColors();
      chart.applyOptions({
        layout: {
          background: { type: ColorType.Solid, color: colors.surface },
          textColor: colors.muted,
          attributionLogo: false,
        },
        grid: {
          vertLines: { color: "transparent" },
          horzLines: { color: "transparent" },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: { color: `${colors.line}38`, width: 1 },
          horzLine: { color: `${colors.line}30`, width: 1 },
        },
        rightPriceScale: {
          borderColor: "transparent",
        },
        timeScale: {
          borderColor: "transparent",
          timeVisible: true,
          secondsVisible: false,
        },
        localization: {
          priceFormatter: formatValue,
        },
      });
      series.applyOptions({ color: colors.line, lineWidth: 2 });
      wrapper.style.backgroundColor = colors.surface;
      wrapper.style.boxShadow = "none";
    };

    const chartHeight = Math.max(height, 200);
    const chart = createChart(container, {
      autoSize: true,
      height: chartHeight,
      layout: {
        background: { type: ColorType.Solid, color: "#ffffff" },
        textColor: "#64748b",
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: "transparent" },
        horzLines: { color: "transparent" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: "transparent" },
      timeScale: { borderColor: "transparent", timeVisible: true, secondsVisible: false },
      localization: { priceFormatter: formatValue },
    });

    const series = chart.addSeries(LineSeries, {
      color: "#0891b2",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    series.setData(
      points.map((p) => ({
        time: p.time as never,
        value: p.value,
      })),
    );

    priceLines.forEach((line) => {
      series.createPriceLine({
        price: line.price,
        color: line.color,
        lineWidth: 2,
        lineStyle: 2,
        axisLabelVisible: true,
        title: line.title,
      });
    });

    chart.timeScale().fitContent();
    applyTheme();

    const themeObserver = new MutationObserver(() => {
      applyTheme();
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] });

    return () => {
      themeObserver.disconnect();
      chart.remove();
    };
  }, [points, height, formatValue, priceLinesKey]);

  return (
    <div ref={wrapperRef} className="relative w-full overflow-hidden bg-background" style={{ height }}>
      <div ref={containerRef} className="relative z-0 w-full" style={{ height: Math.max(height, 200) }} />
      {/** After chart mount target so canvas paints underneath; lightweight-charts uses sibling canvases. */}
      <ChartLabelWatermark variant="markets" className="absolute right-2 top-2 z-20 sm:right-3 sm:top-3" />
    </div>
  );
}
