import { cn } from "@/lib/utils";

const CHART_LABEL_SRC = "/assets/chartlabel.png";

export type ChartLabelWatermarkVariant = "markets" | "portfolio";

type ChartLabelWatermarkProps = {
  variant: ChartLabelWatermarkVariant;
  className?: string;
};

/**
 * Polymarket-style upper-right chart branding.
 * `portfolio` clips the asset so footer disclaimer lines on the PNG are hidden.
 */
export function ChartLabelWatermark({ variant, className }: ChartLabelWatermarkProps) {
  return (
    <div
      className={cn(
        "pointer-events-none select-none",
        variant === "portfolio" ? "h-9 max-w-[7.5rem] overflow-hidden sm:h-10 sm:max-w-[8rem]" : "max-h-14 max-w-[9.5rem] sm:max-h-16 sm:max-w-[10.5rem]",
        className,
      )}
      aria-hidden
    >
      <img
        src={CHART_LABEL_SRC}
        alt=""
        width={220}
        height={120}
        decoding="async"
        className={cn(
          "ml-auto block h-auto w-full",
          variant === "portfolio" ? "object-cover object-top" : "object-contain object-right-top",
        )}
      />
    </div>
  );
}
