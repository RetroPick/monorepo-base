export type KlineInterval = "1m" | "3m" | "5m" | "15m" | "30m" | "1h" | "4h" | "1d";

export interface CoinGeckoMarket {
  id: string;
  symbol: string;
  name: string;
  image?: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  high_24h?: number | null;
  low_24h?: number | null;
  price_change_24h?: number | null;
  price_change_percentage_24h?: number | null;
  last_updated?: string;
}

export interface AssetUniverseEntry {
  id: string;
  symbol: string;
  name: string;
  rank: number;
  priceUsd: number;
  marketCapUsd: number;
  volume24hUsd: number;
  high24hUsd: number | null;
  low24hUsd: number | null;
  priceChange24h: number | null;
  priceChangePct24h: number | null;
  image?: string;
  lastUpdated?: string;
  exchangeSymbol: string;
  displayPair: string;
}

export interface CandlePoint {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

/** Unix seconds + scalar value for line charts (FX, FRED, weather). */
export interface LinePoint {
  time: number;
  value: number;
}

/** Discover header + reference chart asset class toggles. */
export type AssetClass = "crypto" | "commodity" | "fx" | "macro" | "benchmarks" | "weather";

export type ReferenceChartKind = "candles" | "line";

export interface ReferenceChartMeta {
  title: string;
  subtitle: string;
  sourceName: string;
  sourceUrl: string;
  /** Y-axis / legend hint */
  valueUnit?: string;
}

export type ReferenceChartResult =
  | {
      kind: "candles";
      candles: CandlePoint[];
      interval: KlineInterval;
      pairLabel: string;
      assetName: string;
      meta: ReferenceChartMeta;
    }
  | {
      kind: "line";
      points: LinePoint[];
      meta: ReferenceChartMeta;
      /** e.g. compact currency */
      formatValue?: (n: number) => string;
    }
  | {
      kind: "unavailable";
      reason: "missing_fred_key" | "fetch_failed";
      message: string;
      meta: ReferenceChartMeta;
    };

export interface AssetDetailResponse {
  asset: AssetUniverseEntry;
  candles: CandlePoint[];
  interval: KlineInterval;
  livePriceUsd: number;
  chartSource: "binance";
  settlementSource: "oracle";
}

export interface RetroPickRoundCardDTO {
  roundId: string;
  slug: string;
  assetId: string;
  assetSymbol: string;
  assetName: string;
  displayPair: string;
  oracleSource: string;
  roundType: "UP_DOWN";
  intervalLabel: string;
  lockTime: string;
  closeTime: string;
  status: "UPCOMING" | "LIVE" | "LOCKED" | "RESOLVED";
  currentPriceUsd: number | null;
  priceChangePct24h: number | null;
  chartPair: string;
  chartReady: boolean;
  settlementNote: string;
}
