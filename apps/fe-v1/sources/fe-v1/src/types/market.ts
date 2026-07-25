export interface MarketOutcome {
  id: string;
  label: string;
  probability: number;
}

export interface Market {
  id: string;
  title: string;
  category: string;
  icon: string;
  /**
   * Product family for routing and card UI (see `resolveMarketCardLayout` in `@/lib/market-card-layout`).
   * **`Range`** — one pool, mutually exclusive bins. **Multi Yes/No** — omit `isBinary` or use 3+ outcomes: each row is its own Yes/No (not range rules).
   * Also: `Threshold`, `Directional`, `Relative`, etc.
   */
  primitive?: string;
  marketType?: string;
  iconBg?: string;
  iconColor?: string;
  image?: string;
  description?: string;
  outcomes: MarketOutcome[];
  volume: string;
  expiry?: string;
  isFeatured?: boolean;
  /** True when the market is a single two-outcome question (one YES / one NO), not multi-choice lists. */
  isBinary?: boolean;
  /** `updown`: short-horizon Up/Down card with semicircular gauge; default is compact Yes/No. */
  binaryPresentation?: "yesno" | "updown";
  oracleSource?: string;
  timeframe?: string;
  status?: string;
  roundId?: string;
  totalPool?: string;
  lockRule?: string;
  closeRule?: string;
  resolutionFormula?: string;
  invalidationRule?: string;
  settlementLabel?: string;
}

export interface Position {
  id: string;
  marketId: string;
  marketTitle: string;
  side: 'YES' | 'NO';
  outcome: 'Won' | 'Lost' | 'Void' | 'Open';
  entry: number;
  settle: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  date: string;
  category: string;
}

export interface TradeActivity {
  id: string;
  user: string;
  avatar?: string;
  action: 'Bought' | 'Sold';
  side: 'YES' | 'NO';
  outcome: string;
  amount: string;
  price: string;
  time: string;
}

export interface Comment {
  id: string;
  user: string;
  avatar?: string;
  content: string;
  time: string;
  likes: number;
  replies: number;
}
