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
  isBinary?: boolean;
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
