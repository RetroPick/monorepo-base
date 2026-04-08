import { useEffect, useMemo, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { LineChartPanel } from "@/components/markets/LineChartPanel";
import { TradingChart } from "@/components/markets/TradingChart";
import { ThresholdRoundCarousel } from "@/components/threshold/ThresholdRoundCarousel";
import { useAssetContext } from "@/context/AssetContext";
import { useAssetDetail } from "@/hooks/useAssetDetail";
import { isValidAssetClassParam, parseAssetClassParam } from "@/lib/market-data/asset-class-params";
import { loadReferenceChartData } from "@/lib/market-data/reference-series";
import type { AssetClass, AssetUniverseEntry, CandlePoint, KlineInterval, LinePoint, ReferenceChartResult } from "@/lib/market-data/types";
import type { ThresholdRound } from "@/types/threshold";
import { cn } from "@/lib/utils";

const templateOptions = [
  {
    label: "YDAY CLOSE",
    interval: "1d",
    familyLabel: "Above Yesterday Close",
    thresholdLabel: "Previous daily close",
    resolutionLabel: "Today close",
    lockOffsetMs: 60 * 60 * 1000,
    cycleMs: 24 * 60 * 60 * 1000,
  },
  {
    label: "TODAY OPEN",
    interval: "1h",
    familyLabel: "Above Today Open",
    thresholdLabel: "Today open",
    resolutionLabel: "Today close",
    lockOffsetMs: 60 * 60 * 1000,
    cycleMs: 24 * 60 * 60 * 1000,
  },
  {
    label: "WEEKLY OPEN",
    interval: "1d",
    familyLabel: "Above Weekly Open",
    thresholdLabel: "Weekly open",
    resolutionLabel: "Sunday close",
    lockOffsetMs: 6 * 60 * 60 * 1000,
    cycleMs: 7 * 24 * 60 * 60 * 1000,
  },
  {
    label: "MONTHLY OPEN",
    interval: "1d",
    familyLabel: "Above Monthly Open",
    thresholdLabel: "Monthly open",
    resolutionLabel: "Month end",
    lockOffsetMs: 24 * 60 * 60 * 1000,
    cycleMs: 30 * 24 * 60 * 60 * 1000,
  },
] as const;

type TemplateLabel = (typeof templateOptions)[number]["label"];

const TRADING_CHART_HEIGHT = 280;

function formatRoundTime(timestampMs: number) {
  return new Date(timestampMs).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }) + " UTC";
}

function formatStartsIn(distanceMs: number, interval: KlineInterval) {
  const totalSeconds = Math.max(0, Math.floor(distanceMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingMinutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (interval === "1h") {
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(hours).padStart(2, "0")}:${String(remainingMinutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getStartsInFormat(interval: KlineInterval): "mm:ss" | "hh:mm:ss" {
  return interval === "1h" ? "mm:ss" : "hh:mm:ss";
}

function getIntervalMs(interval: KlineInterval) {
  const hour = 60 * 60 * 1000;
  if (interval === "1h") return hour;
  return 24 * hour;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function makeRoundId(asset: AssetUniverseEntry, seed: number, templateLabel: TemplateLabel) {
  const symbolHash = asset.symbol.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const templateHash = templateLabel.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return String((seed + symbolHash * 89 + templateHash * 13) % 90000 + 10000);
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
}

function formatReferenceValue(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function linePointsToSyntheticCandles(points: LinePoint[]): CandlePoint[] {
  return points.map((p) => ({
    time: p.time,
    open: p.value,
    high: p.value,
    low: p.value,
    close: p.value,
  }));
}

function makePseudoAssetForReference(assetClass: AssetClass, meta: { title: string; subtitle: string }): AssetUniverseEntry {
  const sym =
    assetClass === "fx"
      ? "EUR"
      : assetClass === "macro"
        ? "MACRO"
        : assetClass === "benchmarks"
          ? "SPX"
          : assetClass === "commodity"
            ? "OIL"
            : assetClass === "weather"
              ? "WX"
              : "REF";
  return {
    id: `ref-${assetClass}`,
    symbol: sym,
    name: meta.title,
    rank: 12,
    priceUsd: 1,
    marketCapUsd: 0,
    volume24hUsd: 0,
    high24hUsd: null,
    low24hUsd: null,
    priceChange24h: null,
    priceChangePct24h: null,
    exchangeSymbol: sym,
    displayPair: meta.subtitle,
  };
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function getThresholdValue(candles: CandlePoint[], templateLabel: TemplateLabel, fallback: number) {
  const latest = candles[candles.length - 1];
  const previous = candles[candles.length - 2];

  if (templateLabel === "YDAY CLOSE") {
    return previous?.close ?? latest?.open ?? fallback;
  }

  if (templateLabel === "TODAY OPEN") {
    return latest?.open ?? fallback;
  }

  if (templateLabel === "MONTHLY OPEN") {
    const monthlyWindow = candles.slice(-30);
    return monthlyWindow[0]?.open ?? previous?.open ?? latest?.open ?? fallback;
  }

  const weeklyWindow = candles.slice(-7);
  return weeklyWindow[0]?.open ?? previous?.open ?? latest?.open ?? fallback;
}

function buildThresholdRounds(
  asset: AssetUniverseEntry | undefined,
  candles: CandlePoint[] | undefined,
  interval: KlineInterval,
  livePriceUsd: number | undefined,
  templateLabel: TemplateLabel,
  formatThreshold: (value: number) => string = formatPrice,
): ThresholdRound[] {
  if (!asset) return [];

  const template = templateOptions.find((option) => option.label === templateLabel) ?? templateOptions[0];
  const intervalMs = getIntervalMs(interval);
  const now = Date.now();
  const recentCandles = (candles ?? []).slice(-Math.max(7, 8));
  const latestCandle = recentCandles[recentCandles.length - 1];
  const currentPrice = livePriceUsd ?? latestCandle?.close ?? asset.priceUsd ?? 0;
  const thresholdValue = getThresholdValue(recentCandles, templateLabel, currentPrice);
  const meta = {
    assetSymbol: asset.symbol,
    assetName: asset.name,
    assetImage: asset.image,
    displayPair: asset.displayPair,
  };

  const titleBase = `${asset.symbol} above or below ${template.thresholdLabel.toLowerCase()} by ${template.resolutionLabel.toLowerCase()}?`;
  const subtitleBase = `Above resolves if final oracle price is at or above ${formatThreshold(thresholdValue)}. Below resolves if final price finishes under it.`;

  const rounds: ThresholdRound[] = [];
  const expiredCandles = recentCandles.slice(Math.max(0, recentCandles.length - 4), Math.max(0, recentCandles.length - 1));

  expiredCandles.forEach((candle, index) => {
    const localThreshold = templateLabel === "WEEKLY OPEN" || templateLabel === "MONTHLY OPEN"
      ? getThresholdValue(recentCandles.slice(0, recentCandles.length - (expiredCandles.length - index - 1)), templateLabel, candle.open)
      : templateLabel === "YDAY CLOSE"
        ? candle.open
        : candle.open;
    const diffPct = localThreshold > 0 ? ((candle.close - localThreshold) / localThreshold) * 100 : 0;
    const abovePercent = clamp(Math.round(50 + diffPct * 11), 36, 64);
    const belowPercent = 100 - abovePercent;
    const poolBase = 81_000 + asset.rank * 2_100 + index * 4_300;
    const closeTimeMs = candle.time * 1000 + template.cycleMs;
    const lockTimeMs = closeTimeMs - template.lockOffsetMs;

    rounds.push({
      id: makeRoundId(asset, candle.time + index, templateLabel),
      marketId: `${asset.symbol.toLowerCase()}-${templateLabel.toLowerCase().replace(/\s+/g, "-")}-threshold`,
      status: "resolved",
      ...meta,
      title: titleBase,
      subtitle: subtitleBase,
      familyLabel: template.familyLabel,
      scheduleLabel: template.resolutionLabel,
      thresholdLabel: template.thresholdLabel,
      thresholdValue: localThreshold,
      thresholdReferenceAt: formatRoundTime(candle.time * 1000),
      currentPrice: candle.close,
      finalPrice: candle.close,
      prizePool: formatCompactCurrency(poolBase),
      abovePercent,
      belowPercent,
      abovePayout: Number((100 / abovePercent).toFixed(2)),
      belowPayout: Number((100 / belowPercent).toFixed(2)),
      lockTime: formatRoundTime(lockTimeMs),
      resolveTime: formatRoundTime(closeTimeMs),
      ruleText: `Above wins if the final oracle price is at or above ${formatThreshold(localThreshold)} at ${template.resolutionLabel.toLowerCase()}.`,
    });
  });

  const liveOpenTimeMs = latestCandle ? latestCandle.time * 1000 : now;
  const liveThreshold = thresholdValue;
  const liveDiffPct = liveThreshold > 0 ? ((currentPrice - liveThreshold) / liveThreshold) * 100 : 0;
  const liveAbovePercent = clamp(Math.round(50 + liveDiffPct * 12), 34, 66);
  const liveBelowPercent = 100 - liveAbovePercent;
  const liveCloseTimeMs = liveOpenTimeMs + template.cycleMs;
  const liveLockTimeMs = liveCloseTimeMs - template.lockOffsetMs;
  const liveStatus: ThresholdRound["status"] = now >= liveLockTimeMs ? "locked" : "live";

  rounds.push({
    id: makeRoundId(asset, Math.floor(liveOpenTimeMs / 1000), templateLabel),
    marketId: `${asset.symbol.toLowerCase()}-${templateLabel.toLowerCase().replace(/\s+/g, "-")}-threshold`,
    status: liveStatus,
    ...meta,
    title: titleBase,
    subtitle: subtitleBase,
    familyLabel: template.familyLabel,
    scheduleLabel: template.resolutionLabel,
    thresholdLabel: template.thresholdLabel,
    thresholdValue: liveThreshold,
    thresholdReferenceAt: formatRoundTime(liveOpenTimeMs),
    currentPrice,
    prizePool: formatCompactCurrency(95_000 + asset.rank * 3_500),
    abovePercent: liveAbovePercent,
    belowPercent: liveBelowPercent,
    abovePayout: Number((100 / liveAbovePercent).toFixed(2)),
    belowPayout: Number((100 / liveBelowPercent).toFixed(2)),
    lockTime: formatRoundTime(liveLockTimeMs),
    resolveTime: formatRoundTime(liveCloseTimeMs),
    ruleText: `Above wins if the final oracle price is at or above ${formatThreshold(liveThreshold)} at ${template.resolutionLabel.toLowerCase()}. Below wins if it finishes under ${formatThreshold(liveThreshold)}.`,
  });

  const futureStatuses: ThresholdRound["status"][] = ["next", "later", "later"];
  futureStatuses.forEach((status, index) => {
    const referencePrice = currentPrice * (1 + (index - 1) * 0.0025);
    const lockTimeMs = liveCloseTimeMs + template.cycleMs * index + template.cycleMs - template.lockOffsetMs;
    const resolveTimeMs = liveCloseTimeMs + template.cycleMs * (index + 1);
    const abovePercent = clamp(Math.round(50 + (index === 0 ? liveDiffPct * 6 : 0)), 46, 54);
    const belowPercent = 100 - abovePercent;

    rounds.push({
      id: makeRoundId(asset, Math.floor(resolveTimeMs / 1000) + index + 1, templateLabel),
      marketId: `${asset.symbol.toLowerCase()}-${templateLabel.toLowerCase().replace(/\s+/g, "-")}-threshold`,
      status,
      ...meta,
      title: titleBase,
      subtitle: subtitleBase,
      familyLabel: template.familyLabel,
      scheduleLabel: template.resolutionLabel,
      thresholdLabel: template.thresholdLabel,
      thresholdValue: referencePrice,
      thresholdReferenceAt: formatRoundTime(resolveTimeMs - intervalMs),
      currentPrice,
      prizePool: formatCompactCurrency(78_000 + asset.rank * 2_000 - index * 2_500),
      abovePercent,
      belowPercent,
      abovePayout: Number((100 / abovePercent).toFixed(2)),
      belowPayout: Number((100 / belowPercent).toFixed(2)),
      lockTime: formatRoundTime(lockTimeMs),
      resolveTime: formatRoundTime(resolveTimeMs),
      startsIn: status === "later" ? formatStartsIn(lockTimeMs - now, interval) : undefined,
      startsInTargetMs: status === "later" ? lockTimeMs : undefined,
      startsInFormat: status === "later" ? getStartsInFormat(interval) : undefined,
      ruleText: `Above wins if the final oracle price is at or above ${formatThreshold(referencePrice)} at ${template.resolutionLabel.toLowerCase()}.`,
    });
  });

  return rounds;
}

export default function AboveBelowDashboard() {
  const { assetClass: rawParam } = useParams<{ assetClass: string }>();
  const assetClassInvalid = rawParam !== undefined && !isValidAssetClassParam(rawParam);
  const assetClass = parseAssetClassParam(rawParam);

  const { selectedAsset } = useAssetContext();
  const [templateLabel, setTemplateLabel] = useState<TemplateLabel>("YDAY CLOSE");

  const selectedTemplate = templateOptions.find((option) => option.label === templateLabel) ?? templateOptions[0];
  const interval = selectedTemplate.interval as KlineInterval;
  const { data: detail, loading: detailLoading } = useAssetDetail(selectedAsset?.symbol, interval, {
    enabled: assetClass === "crypto",
  });

  const [referenceResult, setReferenceResult] = useState<ReferenceChartResult | null>(null);
  const [referenceLoading, setReferenceLoading] = useState(assetClass !== "crypto");

  useEffect(() => {
    if (assetClass === "crypto") {
      setReferenceResult(null);
      setReferenceLoading(false);
      return;
    }
    let cancelled = false;
    setReferenceLoading(true);
    loadReferenceChartData(assetClass)
      .then((r) => {
        if (!cancelled) setReferenceResult(r);
      })
      .finally(() => {
        if (!cancelled) setReferenceLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [assetClass]);

  const referenceCandles = useMemo(() => {
    if (!referenceResult || referenceResult.kind !== "line") return undefined;
    if (referenceResult.points.length === 0) return undefined;
    return linePointsToSyntheticCandles(referenceResult.points);
  }, [referenceResult]);

  const referenceLivePrice = useMemo(() => {
    if (!referenceResult || referenceResult.kind !== "line") return undefined;
    const pts = referenceResult.points;
    return pts[pts.length - 1]?.value;
  }, [referenceResult]);

  const pseudoAsset = useMemo(() => {
    if (assetClass === "crypto") return undefined;
    if (!referenceResult || referenceResult.kind === "unavailable") return undefined;
    const meta = referenceResult.meta;
    return makePseudoAssetForReference(assetClass, { title: meta.title, subtitle: meta.subtitle });
  }, [assetClass, referenceResult]);

  const formatThreshold = assetClass === "crypto" ? formatPrice : formatReferenceValue;

  const rounds = useMemo(
    () =>
      buildThresholdRounds(
        assetClass === "crypto" ? selectedAsset ?? detail?.asset : pseudoAsset,
        assetClass === "crypto" ? detail?.candles : referenceCandles,
        interval,
        assetClass === "crypto" ? detail?.livePriceUsd : referenceLivePrice,
        templateLabel,
        formatThreshold,
      ),
    [
      assetClass,
      detail?.asset,
      detail?.candles,
      detail?.livePriceUsd,
      interval,
      pseudoAsset,
      referenceCandles,
      referenceLivePrice,
      selectedAsset,
      templateLabel,
    ],
  );

  const activeRound = rounds.find((round) => round.status === "live" || round.status === "locked") ?? rounds[0];
  const activePrice =
    activeRound?.currentPrice
    ?? (assetClass === "crypto" ? detail?.livePriceUsd : referenceLivePrice)
    ?? selectedAsset?.priceUsd
    ?? 0;
  const gapPct = activeRound?.thresholdValue
    ? ((activePrice - activeRound.thresholdValue) / activeRound.thresholdValue) * 100
    : 0;

  if (assetClassInvalid) {
    return <Navigate to="/app/markets/abovebelow/crypto" replace />;
  }

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-background text-foreground">
      <div className="relative flex-1">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.08),transparent_42%)] dark:bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.14),transparent_46%)]" />
          <div className="dashboard-bg-stage absolute inset-x-0 bottom-0 h-[48rem] md:h-[44rem]">
            <div className="dashboard-bg-mesh absolute inset-x-[-8%] bottom-[-8rem] h-[34rem] rounded-[50%] opacity-90 blur-[18px]" />
            <div className="dashboard-bg-orb dashboard-bg-fast absolute left-[-2%] bottom-20 h-[18rem] w-[18rem] rounded-full bg-emerald-400/38 blur-[95px] dark:bg-emerald-400/25" />
            <div className="dashboard-bg-orb dashboard-bg-slow absolute left-[18%] bottom-6 h-[22rem] w-[26rem] rounded-full bg-blue-500/34 blur-[110px] dark:bg-blue-500/24" />
            <div className="dashboard-bg-orb absolute right-[8%] bottom-16 h-[20rem] w-[22rem] rounded-full bg-rose-400/26 blur-[110px] dark:bg-rose-400/18" />
            <div className="dashboard-bg-band absolute left-1/2 bottom-24 h-40 w-[78%] max-w-[72rem] -translate-x-1/2 rounded-[999px] bg-gradient-to-r from-emerald-400/22 via-blue-300/28 to-rose-300/18 blur-[38px]" />
            <div className="dashboard-bg-band dashboard-bg-band-reverse absolute left-1/2 bottom-10 h-32 w-[62%] max-w-[54rem] -translate-x-1/2 rounded-[999px] bg-gradient-to-r from-blue-300/16 via-emerald-400/22 to-rose-300/14 blur-[30px]" />
            <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-background via-background/45 to-transparent" />
          </div>
        </div>

        <Header
          marketFamilyAssetClassNav={{
            basePath: "/app/markets/abovebelow",
            activeClass: assetClass,
          }}
        />

        <main className="relative mx-auto max-w-[1440px] px-4 pb-14 pt-2 lg:px-8">
          {assetClass !== "crypto" ? (
            <p className="mb-2 text-center text-[11px] text-muted-foreground">
              Illustrative threshold rounds — reference data only; not on-chain settlement.
            </p>
          ) : null}
          <section className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
            <div className="min-w-0">
              <div className="h-[280px]">
                {assetClass === "crypto" ? (
                  detailLoading || !detail || !activeRound ? (
                    <div className="flex h-full items-center justify-center rounded-[28px] border border-border bg-card text-sm font-medium text-muted-foreground shadow-[0_24px_64px_-40px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-[#0b0d12]">
                      Loading threshold market...
                    </div>
                  ) : (
                    <TradingChart
                      candles={detail.candles}
                      height={TRADING_CHART_HEIGHT}
                      pair={selectedAsset?.displayPair ?? detail.asset.displayPair}
                      assetName={selectedAsset?.name ?? detail.asset.name}
                      interval={interval}
                      livePriceUsd={detail.livePriceUsd}
                      priceLines={[
                        {
                          price: activeRound.thresholdValue,
                          title: activeRound.thresholdLabel,
                          color: "rgba(16,185,129,0.95)",
                        },
                      ]}
                    />
                  )
                ) : referenceLoading ? (
                  <div className="flex h-full items-center justify-center rounded-[28px] border border-border bg-card text-sm font-medium text-muted-foreground shadow-[0_24px_64px_-40px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-[#0b0d12]">
                    Loading reference series...
                  </div>
                ) : referenceResult?.kind === "unavailable" ? (
                  <div className="flex h-full flex-col justify-center rounded-[28px] border border-border bg-card px-6 py-8 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">{referenceResult.message}</p>
                    {referenceResult.reason === "missing_fred_key" ? (
                      <p className="mt-2 font-mono text-xs">
                        Set <code className="rounded bg-muted px-1">VITE_FRED_API_KEY</code> in{" "}
                        <code className="rounded bg-muted px-1">.env</code> for FRED-backed charts.
                      </p>
                    ) : null}
                  </div>
                ) : referenceResult?.kind === "line" && pseudoAsset ? (
                  <LineChartPanel
                    points={referenceResult.points}
                    height={TRADING_CHART_HEIGHT}
                    title={referenceResult.meta.title}
                    subtitle={referenceResult.meta.subtitle}
                    sourceLine={`${referenceResult.meta.sourceName} · ${referenceResult.meta.valueUnit ?? "series"}`}
                    formatValue={referenceResult.formatValue}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center rounded-[28px] border border-border bg-card text-sm text-muted-foreground">
                    No chart data
                  </div>
                )}
              </div>

              <div className="mt-1 flex flex-wrap items-center justify-between gap-1.5 text-[11px] text-muted-foreground">
                {assetClass === "crypto" ? (
                  <>
                    <span>
                      {detail
                        ? `Chart source: ${detail.chartSource} · Settlement source: ${detail.settlementSource} · Threshold fixed at ${activeRound?.thresholdReferenceAt}`
                        : "Preparing threshold data..."}
                    </span>
                    <span className="font-mono text-accent-cyan">{selectedAsset?.displayPair ?? "BTC/USDT"}</span>
                  </>
                ) : referenceResult && referenceResult.kind !== "unavailable" ? (
                  <>
                    <span>
                      Data: {referenceResult.meta.sourceName} · {referenceResult.meta.subtitle}
                      {activeRound ? ` · Ref ${activeRound.thresholdReferenceAt}` : ""}
                    </span>
                    <span className="font-mono text-accent-cyan">{pseudoAsset?.displayPair ?? "—"}</span>
                  </>
                ) : (
                  <span>Reference chart</span>
                )}
              </div>
            </div>

            <aside className="flex min-h-[240px] flex-col justify-start xl:px-2">
              <div className="p-1 text-foreground">
                <div className="space-y-4">
                  <div className="grid gap-3 rounded-[20px] border border-border/50 bg-background/65 p-4">
                    <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Resolution Logic</div>
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="text-muted-foreground">Current Gap</span>
                      <span className={cn("text-right font-semibold", gapPct >= 0 ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300")}>
                        {gapPct >= 0 ? "+" : ""}{gapPct.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="text-muted-foreground">Above Wins</span>
                      <span className="text-right font-semibold text-foreground">{activeRound ? `>= ${formatThreshold(activeRound.thresholdValue)}` : "--"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="text-muted-foreground">Below Wins</span>
                      <span className="text-right font-semibold text-foreground">{activeRound ? `< ${formatThreshold(activeRound.thresholdValue)}` : "--"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="text-muted-foreground">Resolve Time</span>
                      <span className="text-right font-semibold text-foreground">{activeRound?.resolveTime ?? "--"}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 border-t border-border/50 pt-5 text-foreground">
                  <div className="text-[1rem] font-black tracking-tight sm:text-[1.1rem]">Pick Threshold Type</div>
                  <div className="mt-3 flex flex-wrap gap-2.5">
                    {templateOptions.map((option) => (
                      <button
                        key={option.label}
                        onClick={() => setTemplateLabel(option.label)}
                        className={cn(
                          "rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] transition",
                          templateLabel === option.label
                            ? "bg-foreground text-background shadow-[0_14px_28px_-20px_rgba(15,23,42,0.3)] dark:shadow-[0_14px_28px_-20px_rgba(2,6,23,0.8)]"
                            : "bg-card/70 text-muted-foreground hover:bg-card hover:text-foreground",
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </aside>
          </section>

          <section className="relative -mt-1">
            {rounds.length > 0 ? (
              <ThresholdRoundCarousel rounds={rounds} />
            ) : (
              <div className="rounded-lg border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
                No threshold rounds to display for this reference series yet.
              </div>
            )}
          </section>
        </main>
      </div>

      <div className="relative z-20 mt-auto bg-background">
        <Footer />
      </div>
    </div>
  );
}
