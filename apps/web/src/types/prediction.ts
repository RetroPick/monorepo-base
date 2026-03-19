export type RoundStatus =
  | "exposed"
  | "expired"
  | "live"
  | "next"
  | "locked"
  | "later";

export interface PredictionRound {
  id: string;
  marketId: string;
  status: RoundStatus;
  assetSymbol?: string;
  assetName?: string;
  assetImage?: string;
  displayPair?: string;
  lockPrice: number;
  closePrice?: number;
  lastPrice?: number;
  prizePool: string;
  upPayout: number;
  downPayout: number;
  upPercent: number;
  downPercent: number;
  lockTime: string;
  closeTime: string;
  startsIn?: string;
  startsInTargetMs?: number;
  startsInFormat?: "mm:ss" | "hh:mm:ss";
}

export interface PredictionMarket {
  id: string;
  pair: string;
  oracle: string;
  resolution: string;
  settlement: string;
}
