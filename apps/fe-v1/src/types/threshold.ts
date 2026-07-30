export type ThresholdRoundStatus = "resolved" | "live" | "next" | "locked" | "later";

export interface ThresholdRound {
  id: string;
  marketId: string;
  status: ThresholdRoundStatus;
  assetSymbol?: string;
  assetName?: string;
  assetImage?: string;
  displayPair?: string;
  title: string;
  subtitle: string;
  familyLabel: string;
  scheduleLabel: string;
  thresholdLabel: string;
  thresholdValue: number;
  thresholdReferenceAt: string;
  currentPrice?: number;
  finalPrice?: number;
  prizePool: string;
  abovePercent: number;
  belowPercent: number;
  abovePayout: number;
  belowPayout: number;
  lockTime: string;
  resolveTime: string;
  startsIn?: string;
  startsInTargetMs?: number;
  startsInFormat?: "mm:ss" | "hh:mm:ss";
  ruleText: string;
}
