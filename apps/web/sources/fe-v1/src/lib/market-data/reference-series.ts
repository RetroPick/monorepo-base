import type { AssetClass, ReferenceChartResult } from "./types";
import { ASSET_CLASS_SUBTITLE, DEFAULT_CRYPTO_SYMBOL, FRED_SERIES, FX_PAIR_LABEL, WEATHER_LABEL } from "./asset-classes";
import { fetchBinanceCandles } from "./binance-rest";
import { fetchFrankfurterEurUsdHistory } from "./frankfurter";
import { fetchFredSeries } from "./fred";
import { fetchOpenMeteoTemperatureHistory } from "./open-meteo";

export async function loadReferenceChartData(assetClass: AssetClass): Promise<ReferenceChartResult> {
  const subtitle = ASSET_CLASS_SUBTITLE[assetClass];

  if (assetClass === "crypto") {
    try {
      const candles = await fetchBinanceCandles(DEFAULT_CRYPTO_SYMBOL, "1h", 200);
      return {
        kind: "candles",
        candles,
        interval: "1h",
        pairLabel: "BTC/USDT",
        assetName: "Bitcoin",
        meta: {
          title: subtitle,
          subtitle: "BTC · hourly",
          sourceName: "Binance",
          sourceUrl: "https://www.binance.com/en/trade/BTC_USDT",
        },
      };
    } catch {
      return {
        kind: "unavailable",
        reason: "fetch_failed",
        message: "Could not load crypto candles.",
        meta: {
          title: subtitle,
          subtitle: "BTC / USDT",
          sourceName: "Binance",
          sourceUrl: "https://www.binance.com",
        },
      };
    }
  }

  if (assetClass === "fx") {
    try {
      const points = await fetchFrankfurterEurUsdHistory();
      return {
        kind: "line",
        points,
        formatValue: (n) => n.toFixed(4),
        meta: {
          title: subtitle,
          subtitle: FX_PAIR_LABEL,
          sourceName: "Frankfurter",
          sourceUrl: "https://www.frankfurter.app/",
          valueUnit: "USD per 1 EUR",
        },
      };
    } catch {
      return {
        kind: "unavailable",
        reason: "fetch_failed",
        message: "Could not load FX series.",
        meta: {
          title: subtitle,
          subtitle: FX_PAIR_LABEL,
          sourceName: "Frankfurter",
          sourceUrl: "https://www.frankfurter.app/",
        },
      };
    }
  }

  if (assetClass === "weather") {
    try {
      const points = await fetchOpenMeteoTemperatureHistory();
      return {
        kind: "line",
        points,
        formatValue: (n) => `${n.toFixed(1)}°C`,
        meta: {
          title: subtitle,
          subtitle: WEATHER_LABEL,
          sourceName: "Open-Meteo",
          sourceUrl: "https://open-meteo.com/",
          valueUnit: "°C (daily max)",
        },
      };
    } catch {
      return {
        kind: "unavailable",
        reason: "fetch_failed",
        message: "Could not load weather series.",
        meta: {
          title: subtitle,
          subtitle: WEATHER_LABEL,
          sourceName: "Open-Meteo",
          sourceUrl: "https://open-meteo.com/",
        },
      };
    }
  }

  const fredId =
    assetClass === "commodity"
      ? FRED_SERIES.commodity
      : assetClass === "macro"
        ? FRED_SERIES.macro
        : FRED_SERIES.benchmarks;

  const fredSubtitle =
    assetClass === "commodity"
      ? "WTI crude (USD/bbl)"
      : assetClass === "macro"
        ? "Unemployment rate (%)"
        : "S&P 500 index";

  try {
    const points = await fetchFredSeries(fredId);
    const formatValue =
      assetClass === "macro"
        ? (n: number) => `${n.toFixed(1)}%`
        : assetClass === "benchmarks"
          ? (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 })
          : (n: number) => `$${n.toFixed(2)}`;

    return {
      kind: "line",
      points,
      formatValue,
      meta: {
        title: subtitle,
        subtitle: fredSubtitle,
        sourceName: "FRED",
        sourceUrl: `https://fred.stlouisfed.org/series/${fredId}`,
        valueUnit:
          assetClass === "commodity" ? "USD/bbl" : assetClass === "macro" ? "percent" : "index",
      },
    };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    if (err === "missing_fred_key") {
      return {
        kind: "unavailable",
        reason: "missing_fred_key",
        message: "Add VITE_FRED_API_KEY for commodity, macro, and benchmark charts.",
        meta: {
          title: subtitle,
          subtitle: fredSubtitle,
          sourceName: "FRED",
          sourceUrl: "https://fred.stlouisfed.org/docs/api/api_key.html",
        },
      };
    }
    return {
      kind: "unavailable",
      reason: "fetch_failed",
      message: "Could not load FRED series.",
      meta: {
        title: subtitle,
        subtitle: fredSubtitle,
        sourceName: "FRED",
        sourceUrl: `https://fred.stlouisfed.org/series/${fredId}`,
      },
    };
  }
}
