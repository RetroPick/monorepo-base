import { useEffect, useState } from "react";
import { fetchTopNonStableChartableAssets, FALLBACK_ASSETS } from "@/lib/market-data/coingecko";
import { fetchBinanceCandles } from "@/lib/market-data/binance-rest";
import { makeAssetDetailResponse } from "@/lib/market-data/dto";
import { AssetDetailResponse, AssetUniverseEntry, KlineInterval } from "@/lib/market-data/types";

const DETAIL_TTL_MS = 15_000;
const detailCache = new Map<string, { expiresAt: number; value: AssetDetailResponse }>();

type UseAssetDetailOptions = {
  /** When false, skips fetch (e.g. non-crypto market views use reference data instead). */
  enabled?: boolean;
};

export function useAssetDetail(
  symbol: string | undefined,
  interval: KlineInterval = "1m",
  options?: UseAssetDetailOptions,
) {
  const enabled = options?.enabled ?? true;
  const cacheKey = symbol && enabled ? `${symbol.toUpperCase()}:${interval}` : "";
  const cachedValue = cacheKey ? detailCache.get(cacheKey)?.value ?? null : null;
  const [data, setData] = useState<AssetDetailResponse | null>(cachedValue);
  const [loading, setLoading] = useState(enabled ? !cachedValue : false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !symbol) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    let activeAsset: AssetUniverseEntry | null = null;
    const currentCacheKey = `${symbol.toUpperCase()}:${interval}`;
    const cached = detailCache.get(currentCacheKey);

    if (cached?.value) {
      setData(cached.value);
      setLoading(false);
    }

    const load = async () => {
      try {
        if (!cached || cached.expiresAt <= Date.now()) {
          setLoading(true);
        }
        const assets = await fetchTopNonStableChartableAssets(20, 60);
        const asset = assets.find((entry) => entry.symbol.toLowerCase() === symbol.toLowerCase())
          ?? FALLBACK_ASSETS.find((entry) => entry.symbol.toLowerCase() === symbol.toLowerCase())
          ?? FALLBACK_ASSETS[0];
        activeAsset = asset;
        const [candles, liveCandles] = await Promise.all([
          fetchBinanceCandles(asset.exchangeSymbol, interval, 200),
          fetchBinanceCandles(asset.exchangeSymbol, "1m", 2),
        ]);
        const livePriceUsd = liveCandles[liveCandles.length - 1]?.close
          ?? candles[candles.length - 1]?.close
          ?? asset.priceUsd;
        if (cancelled) return;
        const nextValue = makeAssetDetailResponse({ asset, candles, interval, livePriceUsd });
        detailCache.set(currentCacheKey, {
          expiresAt: Date.now() + DETAIL_TTL_MS,
          value: nextValue,
        });
        setData(nextValue);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const refreshLivePrice = async () => {
      if (!activeAsset) return;

      try {
        const liveCandles = await fetchBinanceCandles(activeAsset.exchangeSymbol, "1m", 2);
        const livePriceUsd = liveCandles[liveCandles.length - 1]?.close;
        if (cancelled || livePriceUsd === undefined) return;

        setData((current) => {
          if (!current) return current;
          const nextValue = { ...current, livePriceUsd };
          detailCache.set(currentCacheKey, {
            expiresAt: Date.now() + DETAIL_TTL_MS,
            value: nextValue,
          });
          return nextValue;
        });
      } catch {
        // Ignore transient live-price failures and keep the last good snapshot.
      }
    };

    load();
    const fullRefreshId = window.setInterval(load, 30_000);
    const liveRefreshId = window.setInterval(refreshLivePrice, 5_000);

    return () => {
      cancelled = true;
      window.clearInterval(fullRefreshId);
      window.clearInterval(liveRefreshId);
    };
  }, [cacheKey, enabled, interval, symbol]);

  return { data, loading, error };
}
