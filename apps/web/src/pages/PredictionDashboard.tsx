import { useMemo, useState } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { InfoCard } from "@/components/prediction/InfoCard";
import { TradingChart } from "@/components/markets/TradingChart";
import { RoundCarousel } from "@/components/prediction/RoundCarousel";
import { useAssetContext } from "@/context/AssetContext";
import { useAssetDetail } from "@/hooks/useAssetDetail";
import { AssetUniverseEntry, CandlePoint, KlineInterval } from "@/lib/market-data/types";
import type { PredictionRound } from "@/types/prediction";
import { cn } from "@/lib/utils";

const timeframeOptions = [
  { label: "5 MIN", interval: "5m" },
  { label: "1 HOUR", interval: "1h" },
  { label: "1 DAY", interval: "1d" },
] as const;

type ChartTimeframeLabel = (typeof timeframeOptions)[number]["label"];

const ROUND_COUNT = 7;
const TRADING_CHART_HEIGHT = 360;

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

function TradingChartLoadingState() {
  return (
    <div className="flex h-full overflow-hidden rounded-[28px] border border-border bg-card text-card-foreground shadow-[0_24px_64px_-40px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-[#0b0d12] dark:text-slate-100 dark:shadow-[0_28px_80px_-44px_rgba(2,6,23,0.82)]">
      <div className="flex w-12 flex-col items-center gap-2 border-r border-border bg-secondary/70 px-2 py-3 dark:border-slate-800 dark:bg-[#111318]">
        {[0, 1, 2, 3, 4, 5].map((item) => (
          <div key={item} className="h-8 w-8 animate-pulse rounded-md bg-muted dark:bg-slate-700/60" />
        ))}
        <div className="mt-auto flex flex-col gap-2">
          <div className="h-8 w-8 animate-pulse rounded-md bg-muted dark:bg-slate-700/60" />
          <div className="h-8 w-8 animate-pulse rounded-md bg-muted dark:bg-slate-700/60" />
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3 dark:border-slate-800">
        <div className="space-y-2">
          <div className="h-3 w-24 animate-pulse rounded-full bg-muted dark:bg-slate-700/70" />
          <div className="h-5 w-36 animate-pulse rounded-full bg-muted/80 dark:bg-slate-700/60" />
        </div>
        <div className="h-8 w-20 animate-pulse rounded-full bg-emerald-500/10 dark:bg-emerald-500/20" />
      </div>
      <div className="border-b border-border px-4 py-3 dark:border-slate-800">
        <div className="h-4 w-2/3 animate-pulse rounded-full bg-muted/80 dark:bg-slate-700/60" />
      </div>
      <div className="relative flex-1 overflow-hidden px-4 py-4">
        <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(to_right,rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.12)_1px,transparent_1px)] [background-position:center] [background-size:20%_25%] dark:opacity-60 dark:[background-image:linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)]" />
        <div className="relative flex h-full items-end gap-2">
          {[0.42, 0.68, 0.5, 0.74, 0.58, 0.8, 0.62, 0.7, 0.54, 0.78, 0.6, 0.72].map((height, index) => (
            <div key={index} className="flex flex-1 items-end justify-center">
              <div className="w-full max-w-4 animate-pulse rounded-full bg-muted-foreground/20 dark:bg-slate-600/70" style={{ height: `${height * 100}%` }} />
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground dark:border-slate-800 dark:text-slate-400">
        Loading chart backfill...
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
  const { selectedAsset } = useAssetContext();
  const [timeframe, setTimeframe] = useState<ChartTimeframeLabel>("1 HOUR");

  const interval = timeframeOptions.find((option) => option.label === timeframe)?.interval as KlineInterval;
  const { data: detail, loading: detailLoading } = useAssetDetail(selectedAsset?.symbol, interval);
  const rounds = useMemo(
    () => buildPredictionRounds(selectedAsset ?? detail?.asset, detail?.candles, interval, detail?.livePriceUsd),
    [detail?.asset, detail?.candles, detail?.livePriceUsd, interval, selectedAsset],
  );

  const infoCards = [
    {
      title: "My Position",
      items: [
        { label: "Active Positions", value: "0" },
        { label: "Selected", value: selectedAsset?.symbol ?? "BTC" },
        { label: "Total PnL", value: "+2.5 SOL" },
      ],
    },
  ];

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-background text-foreground">
      <div className="relative flex-1">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.08),transparent_42%)] dark:bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.14),transparent_46%)]" />
          <div className="dashboard-bg-stage absolute inset-x-0 bottom-0 h-[48rem] md:h-[44rem]">
            <div className="dashboard-bg-mesh absolute inset-x-[-8%] bottom-[-8rem] h-[34rem] rounded-[50%] opacity-90 blur-[18px]" />
            <div className="dashboard-bg-orb dashboard-bg-fast absolute left-[-2%] bottom-20 h-[18rem] w-[18rem] rounded-full bg-cyan-400/45 blur-[95px] dark:bg-cyan-400/28" />
            <div className="dashboard-bg-orb dashboard-bg-slow absolute left-[18%] bottom-6 h-[22rem] w-[26rem] rounded-full bg-blue-500/40 blur-[110px] dark:bg-blue-500/30" />
            <div className="dashboard-bg-orb absolute right-[8%] bottom-16 h-[20rem] w-[22rem] rounded-full bg-emerald-400/35 blur-[110px] dark:bg-emerald-400/22" />
            <div className="dashboard-bg-band absolute left-1/2 bottom-24 h-40 w-[78%] max-w-[72rem] -translate-x-1/2 rounded-[999px] bg-gradient-to-r from-blue-500/28 via-cyan-300/34 to-emerald-300/26 blur-[38px]" />
            <div className="dashboard-bg-band dashboard-bg-band-reverse absolute left-1/2 bottom-10 h-32 w-[62%] max-w-[54rem] -translate-x-1/2 rounded-[999px] bg-gradient-to-r from-cyan-300/18 via-blue-400/28 to-emerald-300/18 blur-[30px]" />
            <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-background via-background/45 to-transparent" />
          </div>
        </div>

        <Header />

        <main className="relative mx-auto max-w-[1440px] px-4 pb-14 pt-40 lg:px-8">
          <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
            <div className="min-w-0">
              <div className="h-[360px]">
                {detailLoading || !detail ? (
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
                )}
              </div>

              <div className="mt-1 flex flex-wrap items-center justify-between gap-1.5 text-[11px] text-muted-foreground">
                <span>{detail ? `Chart source: ${detail.chartSource} · Settlement source: ${detail.settlementSource}` : "Preparing market data..."}</span>
                <span className="font-mono text-accent-cyan">{selectedAsset?.displayPair ?? "BTC/USDT"}</span>
              </div>
            </div>

            <aside className="flex min-h-[360px] flex-col justify-center gap-4 xl:px-3">
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
            <RoundCarousel rounds={rounds} />
          </section>
        </main>
      </div>

      <div className="relative z-20 mt-auto bg-background">
        <Footer />
      </div>
    </div>
  );
}
