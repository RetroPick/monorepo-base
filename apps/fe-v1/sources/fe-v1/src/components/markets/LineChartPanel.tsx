import { useEffect, useRef } from "react";
import { ColorType, createChart, CrosshairMode, LineSeries } from "lightweight-charts";
import type { LinePoint } from "@/lib/market-data/types";

interface LineChartPanelProps {
  points: LinePoint[];
  height?: number;
  title: string;
  subtitle: string;
  sourceLine: string;
  formatValue?: (n: number) => string;
}

function getChartColors() {
  const styles = getComputedStyle(document.documentElement);
  const isDark = document.documentElement.classList.contains("dark");
  const mutedToken = styles.getPropertyValue("--muted-foreground").trim();
  const borderToken = styles.getPropertyValue("--border").trim();

  return {
    isDark,
    surface: isDark
      ? `hsl(${styles.getPropertyValue("--background").trim()})`
      : `hsl(${styles.getPropertyValue("--card").trim()})`,
    foreground: `hsl(${styles.getPropertyValue("--foreground").trim()})`,
    muted: `hsl(${mutedToken})`,
    border: `hsl(${borderToken})`,
    grid: isDark ? `hsl(${borderToken} / 0.08)` : `hsl(${mutedToken} / 0.2)`,
    line: `hsl(${styles.getPropertyValue("--accent-cyan").trim()})`,
    shadow: isDark
      ? "0 28px 80px -44px rgba(2,6,23,0.82)"
      : "0 24px 64px -40px rgba(15,23,42,0.18)",
  };
}

export function LineChartPanel({
  points,
  height = 320,
  title,
  subtitle,
  sourceLine,
  formatValue = (n) => n.toLocaleString(undefined, { maximumFractionDigits: 2 }),
}: LineChartPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

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
          vertLines: { color: colors.grid },
          horzLines: { color: colors.grid },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: { color: `${colors.line}38`, width: 1 },
          horzLine: { color: `${colors.line}30`, width: 1 },
        },
        rightPriceScale: {
          borderColor: `${colors.border}${colors.isDark ? "1f" : "99"}`,
        },
        timeScale: {
          borderColor: `${colors.border}${colors.isDark ? "1f" : "99"}`,
          timeVisible: true,
          secondsVisible: false,
        },
        localization: {
          priceFormatter: formatValue,
        },
      });
      series.applyOptions({ color: colors.line, lineWidth: 2 });
      wrapper.style.backgroundColor = colors.surface;
      wrapper.style.boxShadow = colors.shadow;
    };

    const chart = createChart(container, {
      autoSize: true,
      height: Math.max(height - 64, 200),
      layout: {
        background: { type: ColorType.Solid, color: "#ffffff" },
        textColor: "#64748b",
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: "rgba(148,163,184,0.2)" },
        horzLines: { color: "rgba(148,163,184,0.2)" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: "rgba(148,163,184,0.4)" },
      timeScale: { borderColor: "rgba(148,163,184,0.4)", timeVisible: true, secondsVisible: false },
      localization: { priceFormatter: formatValue },
    });

    const series = chart.addSeries(LineSeries, {
      color: "#0891b2",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
    });

    series.setData(
      points.map((p) => ({
        time: p.time as never,
        value: p.value,
      })),
    );

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
  }, [points, height, formatValue]);

  const colors = getChartColors();
  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  const delta = last && prev ? last.value - prev.value : 0;
  const deltaPct = last && prev && prev.value !== 0 ? (delta / prev.value) * 100 : 0;

  return (
    <div
      ref={wrapperRef}
      className="overflow-hidden rounded-[28px] border border-slate-800 text-slate-100 shadow-[0_28px_80px_-44px_rgba(2,6,23,0.82)]"
      style={{ height }}
    >
      <div className="border-b px-4 py-2.5" style={{ borderColor: colors.border }}>
        <div className="text-sm font-semibold" style={{ color: colors.foreground }}>
          {title}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs" style={{ color: colors.muted }}>
          {subtitle} · {sourceLine}
          {last && prev ? (
            <span className="ml-1 tabular-nums" style={{ color: delta >= 0 ? "#22c55e" : "#ef4444" }}>
              {delta >= 0 ? "+" : ""}
              {formatValue(delta)} ({delta >= 0 ? "+" : ""}
              {deltaPct.toFixed(2)}%)
            </span>
          ) : null}
        </div>
      </div>
      <div ref={containerRef} className="w-full" style={{ height: Math.max(height - 64, 200) }} />
    </div>
  );
}
