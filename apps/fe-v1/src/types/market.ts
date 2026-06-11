export interface MarketOutcome {
  id: string;
  label: string;
  probability: number;
}

export interface Market {
  id: string;
  /** Template slug from indexer (`GET /api/v1/markets`); used for discover filters, not on-chain id. */
  slug?: string;
  title: string;
  category: string;
  icon: string;
  /**
   * Product family for routing and card UI (see `resolveMarketCardLayout` in `@/lib/market-card-layout`).
   * **`Range`**: one pool, mutually exclusive bins. **Multi Yes/No**: omit `isBinary` or use 3+ outcomes: each row is its own Yes/No (not range rules).
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
  /**
   * Discover / card lifecycle label derived from indexer data (see `inferMarketCardLifecycle`):
   * `open` | `lock` | `resolve` | `syncing` | `setup` | `paused` — not CRE oracle “frozen” heuristics.
   */
  status?: string;
  roundId?: string;
  totalPool?: string;
  lockRule?: string;
  closeRule?: string;
  resolutionFormula?: string;
  invalidationRule?: string;
  settlementLabel?: string;
  /**
   * Indexer: `ExecutionMode` (0=Manual, 1=Rolling) when the card is built from a chain `MarketRow`.
   * Used for Discover subtitles and featured eyebrow; omitted for off-chain discovery fixtures.
   */
  chainExecutionMode?: 0 | 1;
  /** Indexer: rolling lifecycle phase (uint8-ish). Present when `chainExecutionMode=1`. */
  chainRollingPhase?: number;
  /** Indexer: rolling halt reason (0=none). Present when `chainExecutionMode=1`. */
  chainRollingHaltReason?: number;
  /** Indexer: active epoch id (if any). */
  chainActiveEpochId?: number;
  /** Indexer: next rolling epoch id (if any). */
  chainRollingNextEpochId?: number;
  /** Indexer: last resolved epoch id (if any). */
  chainLastResolvedEpochId?: number;
  /**
   * Indexer: Solidity `marketType` uint. Used for stable classification labels alongside `marketType` string.
   */
  chainMarketTypeId?: number;
  /** Launch board display ordering from backend metadata. Lower values sort first. */
  chainDisplayOrder?: number;
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
