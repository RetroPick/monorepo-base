import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { fetchTopNonStableChartableAssets, FALLBACK_ASSETS } from "@/lib/market-data/coingecko";
import { fetchBinancePrices } from "@/lib/market-data/binance-rest";
import { AssetUniverseEntry } from "@/lib/market-data/types";

const METADATA_REFETCH_MS = 60_000;
const LIVE_PRICE_REFETCH_MS = 5_000;

function fallbackForLimit(limit: number): AssetUniverseEntry[] {
  return FALLBACK_ASSETS.slice(0, Math.min(limit, FALLBACK_ASSETS.length));
}

function mergeMetadata(
  current: AssetUniverseEntry[],
  incoming: AssetUniverseEntry[],
  limit: number,
): AssetUniverseEntry[] {
  const currentById = new Map(current.map((asset) => [asset.id, asset]));
  const merged = incoming.map((asset) => ({
    ...(currentById.get(asset.id) ?? {}),
    ...asset,
  }));
  return merged.sort((left, right) => left.rank - right.rank).slice(0, limit);
}

function applyLivePrices(
  assets: AssetUniverseEntry[],
  livePrices: Record<string, number>,
): AssetUniverseEntry[] {
  if (!Object.keys(livePrices).length) return assets;
  let mutated = false;
  const next = assets.map((asset) => {
    const livePrice = livePrices[asset.exchangeSymbol.toUpperCase()];
    if (livePrice === undefined) return asset;

    const previousPrice = asset.priceUsd;
    const priceChange24hBase = asset.priceChange24h ?? 0;
    const nextPriceChange24h = priceChange24hBase + (livePrice - previousPrice);
    const baselinePrice = previousPrice - priceChange24hBase;
    const nextPriceChangePct24h =
      baselinePrice > 0
        ? (nextPriceChange24h / baselinePrice) * 100
        : asset.priceChangePct24h;

    if (livePrice === previousPrice) return asset;
    mutated = true;
    return {
      ...asset,
      priceUsd: livePrice,
      priceChange24h: nextPriceChange24h,
      priceChangePct24h: nextPriceChangePct24h ?? asset.priceChangePct24h,
      lastUpdated: new Date().toISOString(),
    };
  });
  return mutated ? next : assets;
}

/**
 * Shared, deduped reference-asset universe.
 *
 * - Metadata (CoinGecko) refreshes every 60s.
 * - Binance spot prices refresh every 5s and overlay the metadata.
 *
 * Multiple consumers ({@link Header}, dashboards) all share the same fetchers
 * because they key on the same `['top-assets', metadata|live, ...]` keys.
 */
export function useTopAssets(limit = 20) {
  const initialFallback = useMemo(() => fallbackForLimit(limit), [limit]);

  const metadataQuery = useQuery<AssetUniverseEntry[]>({
    queryKey: ["top-assets", "metadata", limit],
    queryFn: async () => fetchTopNonStableChartableAssets(limit, 60),
    initialData: initialFallback,
    placeholderData: (previous) => previous,
    refetchInterval: METADATA_REFETCH_MS,
    refetchOnWindowFocus: false,
    staleTime: METADATA_REFETCH_MS,
  });

  const symbols = useMemo(() => {
    return (metadataQuery.data ?? [])
      .map((asset) => asset.exchangeSymbol)
      .filter(Boolean);
  }, [metadataQuery.data]);

  const symbolsKey = useMemo(() => [...symbols].sort().join("|"), [symbols]);

  const livePricesQuery = useQuery<Record<string, number>>({
    queryKey: ["top-assets", "live-prices", symbolsKey],
    queryFn: async () => (symbols.length ? fetchBinancePrices(symbols) : {}),
    enabled: symbols.length > 0,
    refetchInterval: symbols.length ? LIVE_PRICE_REFETCH_MS : false,
    refetchOnWindowFocus: false,
    staleTime: LIVE_PRICE_REFETCH_MS,
  });

  const data = useMemo(() => {
    const base = mergeMetadata(initialFallback, metadataQuery.data ?? initialFallback, limit);
    return applyLivePrices(base, livePricesQuery.data ?? {});
  }, [initialFallback, metadataQuery.data, livePricesQuery.data, limit]);

  return {
    data,
    loading: metadataQuery.isLoading,
    error: metadataQuery.error
      ? metadataQuery.error instanceof Error
        ? metadataQuery.error.message
        : "Unknown error"
      : null,
  };
}
