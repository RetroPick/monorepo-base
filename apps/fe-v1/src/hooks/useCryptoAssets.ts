import { useEffect, useState } from "react";
import { CryptoAsset, FALLBACK_ASSETS, fetchAssetCandles, fetchTopCryptoAssets } from "@/lib/cryptoMarketData";
import { OHLCData } from "@/data/ohlc";

export function useCryptoAssets(limit = 20) {
  const [assets, setAssets] = useState<CryptoAsset[]>(FALLBACK_ASSETS.slice(0, Math.min(limit, FALLBACK_ASSETS.length)));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const result = await fetchTopCryptoAssets(limit);
      if (!cancelled) {
        setAssets(result);
        setIsLoading(false);
      }
    };

    load();
    const interval = window.setInterval(load, 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [limit]);

  return { assets, isLoading };
}

export function useAssetCandles(
  symbol: string | undefined,
  timeframe: "5 MIN" | "1 HOUR" | "1 DAY",
  fallbackAsset?: CryptoAsset,
) {
  const [data, setData] = useState<OHLCData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      const result = await fetchAssetCandles(symbol, timeframe, fallbackAsset);
      if (!cancelled) {
        setData(result);
        setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [symbol, timeframe, fallbackAsset]);

  return { data, isLoading };
}
