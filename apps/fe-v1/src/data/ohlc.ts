export interface OHLCData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export const MOCK_OHLC: OHLCData[] = (() => {
  const data: OHLCData[] = [];
  let base = 1750;
  const now = new Date();
  for (let i = 50; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 6 * 60 * 1000);
    const volatility = 20;
    const change = (Math.random() - 0.5) * volatility;
    const open = base;
    const close = base + change;
    const high = Math.max(open, close) + Math.random() * 8;
    const low = Math.min(open, close) - Math.random() * 8;
    data.push({
      time: d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
      open,
      high,
      low,
      close,
      volume: Math.floor(Math.random() * 1000000) + 100000,
    });
    base = close;
  }
  return data;
})();
