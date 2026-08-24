"use client";

// Watermarks completely disabled for clean TradingView charts
export type ChartLabelWatermarkVariant = "markets" | "portfolio";

type ChartLabelWatermarkProps = {
  variant?: ChartLabelWatermarkVariant;
  className?: string;
  subtle?: boolean;
};

export function ChartLabelWatermark(_props: ChartLabelWatermarkProps) {
  return null;
}

export default ChartLabelWatermark;
