import { useEffect, useRef, useState } from "react";
import { fetchTopNonStableChartableAssets, FALLBACK_ASSETS } from "@/lib/market-data/coingecko";
import { fetchBinancePrices } from "@/lib/market-data/binance-rest";
import { AssetUniverseEntry } from "@/lib/market-data/types";

export function useTopAssets(limit = 20) {
  const [data, setData] = useState<AssetUniverseEntry[]>(FALLBACK_ASSETS.slice(0, Math.min(limit, FALLBACK_ASSETS.length)));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dataRef = useRef<AssetUniverseEntry[]>(data);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    let cancelled = false;

    const mergeAssets = (
      current: AssetUniverseEntry[],
      incoming: AssetUniverseEntry[],
    ): AssetUniverseEntry[] => {
      const currentById = new Map(current.map((asset) => [asset.id, asset]));
      const merged = incoming.map((asset) => ({
        ...(currentById.get(asset.id) ?? {}),
        ...asset,
      }));

      return merged
        .sort((left, right) => left.rank - right.rank)
        .slice(0, limit);
    };

    const load = async (showLoading = false) => {
      try {
        if (showLoading) setLoading(true);
        const next = await fetchTopNonStableChartableAssets(limit, 60);
        if (cancelled) return;
        setData((current) => mergeAssets(current, next));
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (!cancelled && showLoading) setLoading(false);
      }
    };

    const refreshLivePrices = async () => {
      try {
        const symbols = dataRef.current.map((asset) => asset.exchangeSymbol).filter(Boolean);
        if (!symbols.length) return;

        const nextPrices = await fetchBinancePrices(symbols);
        if (cancelled || !Object.keys(nextPrices).length) return;

        setData((current) =>
          current.map((asset) => {
            const livePrice = nextPrices[asset.exchangeSymbol.toUpperCase()];
            if (livePrice === undefined) return asset;

            const previousPrice = asset.priceUsd;
            const priceChange24hBase = asset.priceChange24h ?? 0;
            const nextPriceChange24h = priceChange24hBase + (livePrice - previousPrice);
            const baselinePrice = previousPrice - priceChange24hBase;
            const nextPriceChangePct24h = baselinePrice > 0
              ? (nextPriceChange24h / baselinePrice) * 100
              : asset.priceChangePct24h;

            return {
              ...asset,
              priceUsd: livePrice,
              priceChange24h: nextPriceChange24h,
              priceChangePct24h: nextPriceChangePct24h ?? asset.priceChangePct24h,
              lastUpdated: new Date().toISOString(),
            };
          }),
        );
      } catch {
        // Ignore transient price refresh failures and keep the last known snapshot.
      }
    };

    load(true);
    const metadataInterval = window.setInterval(() => {
      void load(false);
    }, 60_000);
    const liveInterval = window.setInterval(() => {
      void refreshLivePrices();
    }, 5_000);

    return () => {
      cancelled = true;
      window.clearInterval(metadataInterval);
      window.clearInterval(liveInterval);
    };
  }, [limit]);

  return { data, loading, error };
}
