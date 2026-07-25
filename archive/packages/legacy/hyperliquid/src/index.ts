export type HyperliquidSymbol = string;

export type HyperliquidCandle = {
  symbol: HyperliquidSymbol;
  interval: string;
  openTime: number;
  closeTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
};

export interface HyperliquidMarketDataClient {
  candles(symbol: HyperliquidSymbol, interval: string, startTime: number, endTime: number): Promise<HyperliquidCandle[]>;
}

export function normalizeHyperliquidSymbol(symbol: string): HyperliquidSymbol {
  return symbol.trim().toUpperCase();
}
