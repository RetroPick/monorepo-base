"use client";

import { useCallback, useState } from "react";

import { cn } from "@/lib/utils";

/** Served from `apps/web/public/assets/chartlabel.png` */
export const CHART_LABEL_SRC = "/assets/chartlabel.png";

const CHART_LABEL_FALLBACK_SRC = "/retropick-logo.png";

export type ChartLabelWatermarkVariant = "markets" | "portfolio";

type ChartLabelWatermarkProps = {
  variant: ChartLabelWatermarkVariant;
  className?: string;
  /**
   * Small, low-contrast mark aligned to the header row (Polymarket-style). Uses `object-contain` so tiny assets do not “blow up” as solid blocks.
   */
  subtle?: boolean;
};

/**
 * Polymarket-style chart branding. Default `portfolio` clips tall PNG footers; use `subtle` for a compact header mark.
 */
export function ChartLabelWatermark({ variant, className, subtle }: ChartLabelWatermarkProps) {
  const [src, setSrc] = useState(CHART_LABEL_SRC);
  const onImgError = useCallback(() => {
    setSrc((current) => (current === CHART_LABEL_FALLBACK_SRC ? current : CHART_LABEL_FALLBACK_SRC));
  }, []);

  return (
    <div
      className={cn(
        "pointer-events-none select-none shrink-0",
        subtle
          ? "h-4 max-w-[5.5rem] opacity-[0.42] sm:h-[1.125rem] sm:max-w-[6rem] sm:opacity-50"
          : variant === "portfolio"
            ? "h-9 max-w-[7.5rem] overflow-hidden sm:h-10 sm:max-w-[8rem]"
            : "max-h-14 max-w-[9.5rem] sm:max-h-16 sm:max-w-[10.5rem]",
        className,
      )}
      aria-hidden
    >
      <img
        src={src}
        alt=""
        width={220}
        height={120}
        decoding="async"
        onError={onImgError}
        className={cn(
          "ml-auto block h-full w-auto max-w-full",
          subtle || variant === "markets"
            ? "object-contain object-right"
            : "h-auto w-full object-cover object-top",
        )}
      />
    </div>
  );
}
