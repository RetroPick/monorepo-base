import { useEffect, useMemo, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { InfoCard } from "@/components/prediction/InfoCard";
import { LineChartPanel } from "@/components/markets/LineChartPanel";
import { TradingChart } from "@/components/markets/TradingChart";
import { RoundCarousel } from "@/components/prediction/RoundCarousel";
import { useAssetContext } from "@/context/AssetContext";
import { useAssetDetail } from "@/hooks/useAssetDetail";
import { isValidAssetClassParam, parseAssetClassParam } from "@/lib/market-data/asset-class-params";
import { loadReferenceChartData } from "@/lib/market-data/reference-series";
import type { AssetClass, AssetUniverseEntry, CandlePoint, KlineInterval, LinePoint, ReferenceChartResult } from "@/lib/market-data/types";
import type { PredictionRound } from "@/types/prediction";
import { cn } from "@/lib/utils";

const timeframeOptions = [
  { label: "5 MIN", interval: "5m" },
  { label: "1 HOUR", interval: "1h" },
  { label: "1 DAY", interval: "1d" },
] as const;

type ChartTimeframeLabel = (typeof timeframeOptions)[number]["label"];

const ROUND_COUNT = 7;
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

  if (interval === "5m") {
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(hours).padStart(2, "0")}:${String(remainingMinutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getStartsInFormat(interval: KlineInterval): "mm:ss" | "hh:mm:ss" {
  return interval === "5m" ? "mm:ss" : "hh:mm:ss";
}

function getIntervalMs(interval: KlineInterval) {
  const minute = 60_000;

  switch (interval) {
    case "1m":
      return minute;
    case "3m":
      return 3 * minute;
    case "5m":
      return 5 * minute;
    case "15m":
      return 15 * minute;
    case "30m":
      return 30 * minute;
    case "1h":
      return 60 * minute;
    case "4h":
      return 4 * 60 * minute;
    case "1d":
      return 24 * 60 * minute;
    default:
      return 5 * minute;
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function makeRoundNumericId(asset: AssetUniverseEntry, seed: number) {
  const symbolHash = asset.symbol.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return String((seed + symbolHash * 97) % 90000 + 10000);
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

function TradingChartLoadingState() {
  return (
    <div className="relative flex h-full overflow-hidden bg-background text-card-foreground dark:text-slate-100">
      <div className="relative flex-1 overflow-hidden px-2 py-2">
        <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(to_right,rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.12)_1px,transparent_1px)] [background-position:center] [background-size:20%_25%] dark:opacity-60 dark:[background-image:linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)]" />
        <div className="relative flex h-full items-end gap-2">
          {[0.42, 0.68, 0.5, 0.74, 0.58, 0.8, 0.62, 0.7, 0.54, 0.78, 0.6, 0.72].map((height, index) => (
            <div key={index} className="flex flex-1 items-end justify-center">
              <div className="w-full max-w-4 animate-pulse rounded-full bg-muted-foreground/20 dark:bg-slate-600/70" style={{ height: `${height * 100}%` }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function buildPredictionRounds(
  asset: AssetUniverseEntry | undefined,
  candles: CandlePoint[] | undefined,
  interval: KlineInterval,
  livePriceUsd: number | undefined,
): PredictionRound[] {
  if (!asset) return [];

  const intervalMs = getIntervalMs(interval);
  const now = Date.now();
  const recentCandles = (candles ?? []).slice(-Math.max(ROUND_COUNT, 5));
  const latestCandle = recentCandles[recentCandles.length - 1];
  const currentPrice = livePriceUsd ?? latestCandle?.close ?? asset.priceUsd ?? 0;
  const meta = {
    assetSymbol: asset.symbol,
    assetName: asset.name,
    assetImage: asset.image,
    displayPair: asset.displayPair,
  };

  const rounds: PredictionRound[] = [];
  const expiredCandles = recentCandles.slice(Math.max(0, recentCandles.length - 4), Math.max(0, recentCandles.length - 1));

  expiredCandles.forEach((candle, index) => {
    const movePct = candle.open > 0 ? ((candle.close - candle.open) / candle.open) * 100 : 0;
    const upPercent = clamp(Math.round(50 + movePct * 8), 38, 62);
    const downPercent = 100 - upPercent;
    const poolBase = 72_000 + asset.rank * 1_800 + index * 3_250;

    rounds.push({
      id: makeRoundNumericId(asset, candle.time + index),
      marketId: `${asset.symbol.toLowerCase()}-${interval}-direction`,
      status: "expired",
      ...meta,
      lockPrice: candle.open,
      closePrice: candle.close,
      prizePool: `$${poolBase.toLocaleString("en-US")}`,
      upPayout: Number((100 / upPercent).toFixed(2)),
      downPayout: Number((100 / downPercent).toFixed(2)),
      upPercent,
      downPercent,
      lockTime: formatRoundTime(candle.time * 1000),
      closeTime: formatRoundTime(candle.time * 1000 + intervalMs),
    });
  });

  const liveOpenTimeMs = latestCandle ? latestCandle.time * 1000 : now;
  const liveMovePct = latestCandle?.open ? ((currentPrice - latestCandle.open) / latestCandle.open) * 100 : asset.priceChangePct24h ?? 0;
  const liveUpPercent = clamp(Math.round(50 + liveMovePct * 10), 35, 65);
  const liveDownPercent = 100 - liveUpPercent;

  rounds.push({
    id: makeRoundNumericId(asset, Math.floor(liveOpenTimeMs / 1000)),
    marketId: `${asset.symbol.toLowerCase()}-${interval}-direction`,
    status: "live",
    ...meta,
    lockPrice: latestCandle?.open ?? currentPrice,
    lastPrice: currentPrice,
    prizePool: `$${(88_000 + asset.rank * 2_400).toLocaleString("en-US")}`,
    upPayout: Number((100 / liveUpPercent).toFixed(2)),
    downPayout: Number((100 / liveDownPercent).toFixed(2)),
    upPercent: liveUpPercent,
    downPercent: liveDownPercent,
    lockTime: formatRoundTime(liveOpenTimeMs),
    closeTime: formatRoundTime(liveOpenTimeMs + intervalMs),
  });

  const futureStatuses: PredictionRound["status"][] = ["next", "later", "later"];

  futureStatuses.forEach((status, index) => {
    const lockTimeMs = liveOpenTimeMs + intervalMs * (index + 1);
    const closeTimeMs = lockTimeMs + intervalMs;
    rounds.push({
      id: makeRoundNumericId(asset, Math.floor(lockTimeMs / 1000) + index + 1),
      marketId: `${asset.symbol.toLowerCase()}-${interval}-direction`,
      status,
      ...meta,
      lockPrice: currentPrice,
      lastPrice: currentPrice,
      prizePool: `$${(76_000 + asset.rank * 2_000 - index * 2_300).toLocaleString("en-US")}`,
      upPayout: 2,
      downPayout: 2,
      upPercent: 50,
      downPercent: 50,
      lockTime: formatRoundTime(lockTimeMs),
      closeTime: formatRoundTime(closeTimeMs),
      startsIn: status === "later" ? formatStartsIn(lockTimeMs - now, interval) : undefined,
      startsInTargetMs: status === "later" ? lockTimeMs : undefined,
      startsInFormat: status === "later" ? getStartsInFormat(interval) : undefined,
    });
  });

  return rounds;
}

export default function PredictionDashboard() {
  const { assetClass: rawParam } = useParams<{ assetClass: string }>();
  const assetClassInvalid = rawParam !== undefined && !isValidAssetClassParam(rawParam);
  const assetClass = parseAssetClassParam(rawParam);

  const { selectedAsset } = useAssetContext();
  const [timeframe, setTimeframe] = useState<ChartTimeframeLabel>("1 HOUR");

  const interval = timeframeOptions.find((option) => option.label === timeframe)?.interval as KlineInterval;
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

  const rounds = useMemo(() => {
    if (assetClass === "crypto") {
      return buildPredictionRounds(selectedAsset ?? detail?.asset, detail?.candles, interval, detail?.livePriceUsd);
    }
    if (!pseudoAsset || !referenceCandles) return [];
    return buildPredictionRounds(pseudoAsset, referenceCandles, interval, referenceLivePrice);
  }, [assetClass, detail?.asset, detail?.candles, detail?.livePriceUsd, interval, pseudoAsset, referenceCandles, referenceLivePrice, selectedAsset]);

  const infoCards = [
    {
      title: "My Position",
      items: [
        { label: "Active Positions", value: "0" },
        {
          label: "Selected",
          value: assetClass === "crypto" ? selectedAsset?.symbol ?? "BTC" : pseudoAsset?.symbol ?? assetClass,
        },
        { label: "Total PnL", value: "+2.5 SOL" },
      ],
    },
  ];

  if (assetClassInvalid) {
    return <Navigate to="/app/markets/updown/crypto" replace />;
  }

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-background text-foreground">
      <Header
        marketFamilyAssetClassNav={{
          basePath: "/app/markets/updown",
          activeClass: assetClass,
        }}
      />

      <div className="relative flex-1 bg-background">
        <main className="relative mx-auto max-w-[1440px] px-5 pb-16 pt-6 lg:px-10">
          {assetClass !== "crypto" ? (
            <p className="mb-2 text-center text-[11px] text-muted-foreground">
              Illustrative rounds — reference data only; not on-chain settlement.
            </p>
          ) : null}
          <section className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
            <div className="min-w-0">
              <div className="h-[280px]">
                {assetClass === "crypto" ? (
                  detailLoading || !detail ? (
                    <TradingChartLoadingState />
                  ) : (
                    <TradingChart
                      candles={detail.candles}
                      height={TRADING_CHART_HEIGHT}
                      pair={selectedAsset?.displayPair ?? detail.asset.displayPair}
                      assetName={selectedAsset?.name ?? detail.asset.name}
                      interval={interval}
                      livePriceUsd={detail.livePriceUsd}
                    />
                  )
                ) : referenceLoading ? (
                  <TradingChartLoadingState />
                ) : referenceResult?.kind === "unavailable" ? (
                  <div className="flex h-full flex-col justify-center bg-background px-2 py-8 text-sm text-muted-foreground">
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
                  <div className="flex h-full items-center justify-center bg-background text-sm text-muted-foreground">
                    No chart data
                  </div>
                )}
              </div>

              <div className="mt-1 flex flex-wrap items-center justify-between gap-1.5 text-[11px] text-muted-foreground">
                {assetClass === "crypto" ? (
                  <>
                    <span>{detail ? `Chart source: ${detail.chartSource} · Settlement source: ${detail.settlementSource}` : "Preparing market data..."}</span>
                    <span className="font-mono text-accent-cyan">{selectedAsset?.displayPair ?? "BTC/USDT"}</span>
                  </>
                ) : referenceResult && referenceResult.kind !== "unavailable" ? (
                  <>
                    <span>
                      Data: {referenceResult.meta.sourceName} · {referenceResult.meta.subtitle}
                    </span>
                    <span className="font-mono text-accent-cyan">{pseudoAsset?.displayPair ?? "—"}</span>
                  </>
                ) : (
                  <span>Reference chart</span>
                )}
              </div>
            </div>

            <aside className="flex min-h-[240px] flex-col justify-center gap-3 xl:px-2">
              {infoCards.map((card) => (
                <InfoCard key={card.title} title={card.title} items={card.items} />
              ))}
              <div className="px-1 pb-1 pt-2 text-center text-foreground">
                <div className="text-[1.2rem] font-black tracking-tight sm:text-[1.35rem]">Pick Market Type:</div>
                <div className="mt-4 flex flex-wrap justify-center gap-2.5">
                  {timeframeOptions.map((option) => (
                    <button
                      key={option.label}
                      onClick={() => setTimeframe(option.label)}
                      className={cn(
                        "rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] transition",
                        timeframe === option.label
                          ? "bg-foreground text-background shadow-[0_14px_28px_-20px_rgba(15,23,42,0.3)] dark:shadow-[0_14px_28px_-20px_rgba(2,6,23,0.8)]"
                          : "bg-card/70 text-muted-foreground hover:bg-card hover:text-foreground",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </aside>
          </section>

          <section className="relative -mt-1">
            {rounds.length > 0 ? (
              <RoundCarousel rounds={rounds} />
            ) : (
              <div className="rounded-lg border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
                No rounds to display for this reference series yet.
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
