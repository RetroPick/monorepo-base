import { useMemo } from "react";
import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { type OHLCData } from "@/data/ohlc";
import { CryptoAsset } from "@/lib/cryptoMarketData";
import { useAssetCandles } from "@/hooks/useCryptoAssets";
import { cn } from "@/lib/utils";

export const timeframeOptions = ["5 MIN", "1 HOUR", "1 DAY"] as const;
export type ChartTimeframe = (typeof timeframeOptions)[number];

interface PredictionChartProps {
  asset?: CryptoAsset;
  lockTime?: string;
  closeTime?: string;
  timeframe: ChartTimeframe;
}

function formatPrice(value: number) {
  if (value >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (value >= 1) return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
  return value.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { payload: OHLCData }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const isUp = d.close >= d.open;
  return (
    <div className="rounded-xl border border-border bg-card/95 p-3 text-xs shadow-xl backdrop-blur">
      <div className="mb-2 text-muted-foreground">{label}</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono">
        <span>O</span> <span className={isUp ? "text-accent-cyan" : "text-accent-magenta"}>{formatPrice(d.open)}</span>
        <span>H</span> <span className={isUp ? "text-accent-cyan" : "text-accent-magenta"}>{formatPrice(d.high)}</span>
        <span>L</span> <span className={isUp ? "text-accent-cyan" : "text-accent-magenta"}>{formatPrice(d.low)}</span>
        <span>C</span> <span className={isUp ? "text-accent-cyan" : "text-accent-magenta"}>{formatPrice(d.close)}</span>
      </div>
      {d.volume && <div className="mt-2 text-muted-foreground">Vol: {(d.volume / 1e6).toFixed(2)}M</div>}
    </div>
  );
}

export function PredictionChart({ asset, lockTime = "16:32", closeTime = "17:32", timeframe }: PredictionChartProps) {
  const { data, isLoading } = useAssetCandles(asset?.symbol, timeframe, asset);

  const chartData = useMemo(
    () =>
      data.map((d) => ({
        ...d,
        isUp: d.close >= d.open,
      })),
    [data],
  );

  const lastCandle = chartData[chartData.length - 1];
  const lastPrice = lastCandle?.close ?? asset?.priceUsd ?? 0;
  const dayChange = asset?.change24hPct ?? 0;
  const lockIdx = Math.max(0, Math.floor(chartData.length * 0.6));
  const closeIdx = Math.max(0, chartData.length - 1);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-end">
        {asset && (
          <div className="grid gap-2 sm:grid-cols-4">
            <div className="rounded-2xl border border-border/50 bg-card/65 px-4 py-3 backdrop-blur">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Spot</div>
              <div className="mt-1 text-sm font-semibold text-foreground">${formatPrice(asset.priceUsd)}</div>
            </div>
            <div className="rounded-2xl border border-border/50 bg-card/65 px-4 py-3 backdrop-blur">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">24h</div>
              <div className={cn("mt-1 text-sm font-semibold", dayChange >= 0 ? "text-emerald-500" : "text-rose-500")}>
                {dayChange >= 0 ? "+" : ""}{dayChange.toFixed(2)}%
              </div>
            </div>
            <div className="rounded-2xl border border-border/50 bg-card/65 px-4 py-3 backdrop-blur">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">High</div>
              <div className="mt-1 text-sm font-semibold text-foreground">${formatPrice(asset.high24hUsd || asset.priceUsd)}</div>
            </div>
            <div className="rounded-2xl border border-border/50 bg-card/65 px-4 py-3 backdrop-blur">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Low</div>
              <div className="mt-1 text-sm font-semibold text-foreground">${formatPrice(asset.low24hUsd || asset.priceUsd)}</div>
            </div>
          </div>
        )}
      </div>

      <div className="min-h-[340px] flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 12, right: 12, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2dd4bf" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#2dd4bf" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.12} vertical={false} />
            <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} minTickGap={40} />
            <YAxis
              domain={["auto", "auto"]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={(v) => `$${formatPrice(v)}`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            {chartData[lockIdx] && (
              <ReferenceLine
                x={chartData[lockIdx].time}
                stroke="#2dd4bf"
                strokeDasharray="4 4"
                label={{ value: `LOCK ${lockTime}`, position: "top", fill: "#2dd4bf", fontSize: 10 }}
              />
            )}
            {chartData[closeIdx] && lockIdx !== closeIdx && (
              <ReferenceLine
                x={chartData[closeIdx].time}
                stroke="#d946ef"
                strokeDasharray="4 4"
                label={{ value: `CLOSE ${closeTime}`, position: "top", fill: "#d946ef", fontSize: 10 }}
              />
            )}
            <Area type="monotone" dataKey="close" stroke="#2dd4bf" strokeWidth={2} fill="url(#chartGradient)" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {isLoading ? "Refreshing market data..." : asset ? `Binance klines for ${asset.symbol}/USDT · CoinGecko top assets` : "Market data ready"}
        </span>
        <span className="font-mono text-sm font-bold text-accent-cyan">${formatPrice(lastPrice)}</span>
      </div>
    </div>
  );
}
