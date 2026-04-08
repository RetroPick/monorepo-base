import { useEffect, useRef } from "react";
import { createChart, CandlestickSeries, ColorType, CrosshairMode } from "lightweight-charts";
import type { CandlePoint, KlineInterval } from "@/lib/market-data/types";

interface TradingChartProps {
  candles: CandlePoint[];
  height?: number;
  pair?: string;
  assetName?: string;
  interval?: KlineInterval;
  livePriceUsd?: number;
  priceLines?: Array<{
    price: number;
    title: string;
    color: string;
  }>;
}

function formatPrice(value: number) {
  if (value >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (value >= 1) return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
  return value.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

function formatInterval(interval?: KlineInterval) {
  if (interval === "1h") return "1h";
  if (interval === "1d") return "1d";
  return "5m";
}

function getChartColors() {
  const styles = getComputedStyle(document.documentElement);
  const isDark = document.documentElement.classList.contains("dark");
  const mutedToken = styles.getPropertyValue("--muted-foreground").trim();
  const borderToken = styles.getPropertyValue("--border").trim();

  return {
    isDark,
    background: `hsl(${styles.getPropertyValue("--background").trim()})`,
    surface: isDark
      ? `hsl(${styles.getPropertyValue("--background").trim()})`
      : `hsl(${styles.getPropertyValue("--card").trim()})`,
    foreground: `hsl(${styles.getPropertyValue("--foreground").trim()})`,
    muted: `hsl(${mutedToken})`,
    border: `hsl(${borderToken})`,
    grid: isDark ? `hsl(${borderToken} / 0.08)` : `hsl(${mutedToken} / 0.2)`,
    cyan: `hsl(${styles.getPropertyValue("--accent-cyan").trim()})`,
    up: isDark ? "#22c55e" : "#16a34a",
    down: isDark ? "#ef4444" : "#dc2626",
    shadow: isDark
      ? "0 28px 80px -44px rgba(2,6,23,0.82)"
      : "0 24px 64px -40px rgba(15,23,42,0.18)",
  };
}

export function TradingChart({
  candles,
  height = 280,
  pair = "BTC/USDT",
  assetName = "Bitcoin",
  interval,
  livePriceUsd,
  priceLines = [],
}: TradingChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const current = candles[candles.length - 1];
  const currentClose = livePriceUsd ?? current?.close ?? 0;
  const previousClose = candles[candles.length - 2]?.close ?? current?.open ?? currentClose;
  const change = currentClose - previousClose;
  const changePct = previousClose ? (change / previousClose) * 100 : 0;

  useEffect(() => {
    const container = containerRef.current;
    const wrapper = wrapperRef.current;
    if (!container || !wrapper) return;

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
          vertLine: { color: `${colors.cyan}${colors.isDark ? "38" : "24"}`, width: 1 },
          horzLine: { color: `${colors.cyan}${colors.isDark ? "30" : "1f"}`, width: 1 },
        },
        rightPriceScale: {
          borderColor: `${colors.border}${colors.isDark ? "1f" : "99"}`,
        },
        timeScale: {
          borderColor: `${colors.border}${colors.isDark ? "1f" : "99"}`,
          timeVisible: true,
          secondsVisible: false,
        },
      });

      series.applyOptions({
        upColor: colors.up,
        downColor: colors.down,
        borderUpColor: colors.up,
        borderDownColor: colors.down,
        wickUpColor: colors.up,
        wickDownColor: colors.down,
      });

      wrapper.style.backgroundColor = colors.surface;
      wrapper.style.color = colors.foreground;
      wrapper.style.borderColor = colors.border;
      wrapper.style.boxShadow = colors.shadow;
    };

    const chartPaneHeight = Math.max(height - 64, 120);
    const chart = createChart(container, {
      autoSize: true,
      height: chartPaneHeight,
      layout: {
        background: { type: ColorType.Solid, color: "#ffffff" },
        textColor: "#64748b",
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: "rgba(148,163,184,0.2)" },
        horzLines: { color: "rgba(148,163,184,0.2)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "rgba(8,145,178,0.22)", width: 1 },
        horzLine: { color: "rgba(8,145,178,0.18)", width: 1 },
      },
      rightPriceScale: {
        borderColor: "rgba(148,163,184,0.4)",
      },
      timeScale: {
        borderColor: "rgba(148,163,184,0.4)",
        timeVisible: true,
        secondsVisible: false,
      },
      localization: {
        priceFormatter: (value) => `$${formatPrice(value)}`,
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#16a34a",
      downColor: "#dc2626",
      borderUpColor: "#16a34a",
      borderDownColor: "#dc2626",
      wickUpColor: "#16a34a",
      wickDownColor: "#dc2626",
      priceLineVisible: false,
      lastValueVisible: false,
    });

    series.setData(
      candles.map((candle) => ({
        time: candle.time as never,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
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

    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });

    return () => {
      themeObserver.disconnect();
      chart.remove();
    };
  }, [candles, height, priceLines]);

  const colors = getChartColors();

  return (
    <div
      ref={wrapperRef}
      className="overflow-hidden rounded-[28px] border border-slate-800 text-slate-100 shadow-[0_28px_80px_-44px_rgba(2,6,23,0.82)]"
      style={{ height }}
    >
      <div className="border-b px-3 py-2" style={{ borderColor: colors.border }}>
        <div className="text-xs font-semibold sm:text-sm" style={{ color: colors.foreground }}>{assetName}</div>
        <div className="mt-0.5 flex flex-nowrap items-center gap-x-2 overflow-x-auto text-[11px] sm:text-xs" style={{ color: colors.muted }}>
          {pair.replace("/USDT", " / TetherUS")} · {formatInterval(interval)} · Binance
          {current ? (
            <span className="ml-2" style={{ color: change >= 0 ? colors.up : colors.down }}>
              {change >= 0 ? "+" : ""}{formatPrice(change)} ({change >= 0 ? "+" : ""}{changePct.toFixed(2)}%)
            </span>
          ) : null}
        </div>
      </div>
      <div ref={containerRef} className="w-full" style={{ height: Math.max(height - 64, 120) }} />
    </div>
  );
}
