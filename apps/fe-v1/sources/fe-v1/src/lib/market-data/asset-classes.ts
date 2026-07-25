import type { AssetClass } from "./types";

/** Pills in the lower rail (display labels). */
export const ASSET_CLASS_OPTIONS: readonly { id: AssetClass; label: string }[] = [
  { id: "crypto", label: "Crypto" },
  { id: "commodity", label: "Commodity" },
  { id: "fx", label: "FX" },
  { id: "macro", label: "Macro" },
  { id: "benchmarks", label: "Benchmarks" },
  { id: "weather", label: "Weather" },
] as const;

/** Text after "|" in the lower rail (plan copy). */
export const ASSET_CLASS_SUBTITLE: Record<AssetClass, string> = {
  crypto: "Crypto assets",
  commodity: "Commodity benchmarks",
  fx: "FX pairs",
  macro: "Macro indicators",
  benchmarks: "Benchmark indices",
  weather: "Weather conditions",
};

export const DEFAULT_CRYPTO_SYMBOL = "BTCUSDT";

/** FRED series IDs (https://fred.stlouisfed.org). */
export const FRED_SERIES = {
  commodity: "DCOILWTICO",
  macro: "UNRATE",
  benchmarks: "SP500",
} as const;

/** NYC — Open-Meteo archive/forecast. */
export const WEATHER_LAT = 40.7128;
export const WEATHER_LON = -74.006;
export const WEATHER_LABEL = "New York (°C)";

/** Frankfurter: EUR/USD (amount of USD per 1 EUR). */
export const FX_FROM = "EUR";
export const FX_TO = "USD";
export const FX_PAIR_LABEL = "EUR/USD";
