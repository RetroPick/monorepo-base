"use client";

import { useEffect, useRef, useMemo } from "react";
import {
  createChart,
  LineSeries,
  ColorType,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";

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

// Generate realistic Polymarket-authentic step-line time-series
function generateHeroStepSeries(
  targetPrice: number,
  count: number,
  startTime: number,
  stepSeconds: number,
  seedKey: string,
): { time: Time; value: number }[] {
  const prng = createPrng(seedKey);
  const volatility = 4.5;

  const startDrift = (prng() - 0.5) * volatility * 2.0;
  const startPrice = Math.max(1, Math.min(99, targetPrice - startDrift));

  const rawBridge: number[] = [startPrice];
  let curr = startPrice;
  let holdCount = 0;

  for (let i = 1; i < count; i++) {
    if (holdCount > 0) {
      rawBridge.push(curr);
      holdCount--;
      continue;
    }

    const u1 = Math.max(1e-6, prng());
    const u2 = prng();
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

    const jump = prng() < 0.12 ? (prng() - 0.5) * volatility * 2.0 : 0;
    const meanPull = (targetPrice - curr) * 0.08;

    curr = Math.max(0.5, Math.min(99.5, curr + z * volatility * 0.35 + jump + meanPull));
    rawBridge.push(Math.round(curr * 10) / 10);

    // Plateau hold for 2 to 4 intervals
    if (prng() < 0.45) {
      holdCount = Math.floor(prng() * 3) + 1;
    }
  }

  const result: { time: Time; value: number }[] = [];
  const wFinal = rawBridge[count - 1];

  for (let i = 0; i < count; i++) {
    const t = (startTime + i * stepSeconds) as Time;
    const progress = i / (count - 1);
    const adjustedVal = rawBridge[i] + progress * (targetPrice - wFinal);
    const clampedVal = Math.max(0.5, Math.min(99.5, adjustedVal));

    result.push({
      time: t,
      value: i === count - 1 ? targetPrice : Math.round(clampedVal * 10) / 10,
    });
  }

  return result;
}

export function HeroTradingViewChart({
  isLiveSports,
  sportsData,
  outcomeData,
  selectedOutcomeIdx = 0,
  onSelectOutcome,
  activeTeamTab = "team1",
}: HeroTradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<any>[]>([]);

  const now = Math.floor(Date.now() / 1000);
  const count = 75;
  const stepSeconds = 600; // 10 min steps
  const startTime = now - count * stepSeconds;

  // Prepare Live Sports Series Data (Dodgers vs Rockies)
  const sportsSeriesData = useMemo(() => {
    if (!isLiveSports || !sportsData) return null;
    const prob1 = sportsData.team1.prob;
    const prob2 = sportsData.team2.prob;

    const data1 = generateHeroStepSeries(prob1, count, startTime, stepSeconds, `${sportsData.team1.name}-hero`);
    const data2 = generateHeroStepSeries(prob2, count, startTime, stepSeconds, `${sportsData.team2.name}-hero`);

    return {
      team1: { name: sportsData.team1.name, color: sportsData.team1.color, data: data1, current: prob1 },
      team2: { name: sportsData.team2.name, color: sportsData.team2.color, data: data2, current: prob2 },
    };
  }, [isLiveSports, sportsData, count, startTime, stepSeconds]);

  // Prepare Multi-Outcome Series Data
  const outcomeSeriesData = useMemo(() => {
    if (isLiveSports || !outcomeData?.outcomes) return null;
    const outcomes = outcomeData.outcomes;

    return outcomes.map((out, idx) => {
      const data = generateHeroStepSeries(out.percentage, count, startTime, stepSeconds, `${out.label}-hero-${idx}`);
      return {
        label: out.label,
        color: out.color,
        percentage: out.percentage,
        data,
      };
    });
  }, [isLiveSports, outcomeData, count, startTime, stepSeconds]);

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      seriesRef.current = [];
    }

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 185;

    const chart = createChart(container, {
      width,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#64748B",
        fontSize: 10,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      },
      localization: {
        priceFormatter: (price: number) => `${Math.round(price)}%`,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: "rgba(255, 255, 255, 0.05)", style: LineStyle.Dotted },
      },
      rightPriceScale: {
        visible: true,
        borderVisible: false,
        scaleMargins: { top: 0.12, bottom: 0.12 },
        ticksVisible: false,
        autoScale: true,
        alignLabels: true,
      },
      timeScale: {
        visible: false,
        borderVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      crosshair: {
        vertLine: {
          color: "rgba(59, 130, 246, 0.4)",
          width: 1,
          style: LineStyle.Dashed,
          labelVisible: false,
        },
        horzLine: {
          color: "rgba(59, 130, 246, 0.4)",
          width: 1,
          style: LineStyle.Dashed,
          labelVisible: true,
        },
      },
      handleScroll: false,
      handleScale: false,
    });

    chartRef.current = chart;

    if (isLiveSports && sportsSeriesData) {
      const s1 = chart.addSeries(LineSeries, {
        color: sportsSeriesData.team1.color,
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: true,
        crosshairMarkerVisible: true,
        priceFormat: {
          type: "custom",
          formatter: (price: number) => `${Math.round(price)}%`,
        },
      });
      s1.setData(sportsSeriesData.team1.data);

      const s2 = chart.addSeries(LineSeries, {
        color: sportsSeriesData.team2.color,
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: true,
        crosshairMarkerVisible: true,
        priceFormat: {
          type: "custom",
          formatter: (price: number) => `${Math.round(price)}%`,
        },
      });
      s2.setData(sportsSeriesData.team2.data);

      seriesRef.current = [s1, s2];
    } else if (outcomeSeriesData) {
      const seriesList: ISeriesApi<any>[] = [];
      outcomeSeriesData.forEach((item, idx) => {
        const isSelected = selectedOutcomeIdx === idx;
        const s = chart.addSeries(LineSeries, {
          color: item.color,
          lineWidth: isSelected ? 2 : 1,
          lineStyle: LineStyle.Solid,
          priceLineVisible: false,
          lastValueVisible: true,
          crosshairMarkerVisible: true,
          priceFormat: {
            type: "custom",
            formatter: (price: number) => `${Math.round(price)}%`,
          },
        });
        s.setData(item.data);
        seriesList.push(s);
      });
      seriesRef.current = seriesList;
    }

    chart.timeScale().fitContent();

    // Clean any watermark / logo nodes
    const cleanLogos = () => {
      container
        .querySelectorAll(
          'a[href*="tradingview"], div[class*="attribution"], div[id*="tv-attr-logo"], #tv-attr-logo, .tv-watermark',
        )
        .forEach((el) => el.remove());
    };
    cleanLogos();

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
        seriesRef.current = [];
      }
    };
  }, [isLiveSports, sportsSeriesData, outcomeSeriesData, activeTeamTab, selectedOutcomeIdx]);

  return (
    <div className="relative flex flex-col justify-between w-full h-full">
      {/* TradingView Step-Line Canvas Container */}
      <div className="relative h-[185px] w-full overflow-hidden rounded-xl bg-transparent">
        <div ref={chartContainerRef} className="h-full w-full" />
      </div>
    </div>
  );
}

export default HeroTradingViewChart;
