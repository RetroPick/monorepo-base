import type { ReactNode } from "react";
import { Calendar } from "lucide-react";

import { ChartLabelWatermark } from "@/shared/components/ChartLabelWatermark";
import { discoverChipActive, discoverChipIdle, discoverChipPill } from "@/shared/lib/ui/discover-chip-styles";
import { cn } from "@/shared/lib/utils";

export type NetWorthTimeframe = "all" | "30d" | "7d";

export type NetWorthCardProps = {
  netWorthLabel: string;
  timeframe: NetWorthTimeframe;
  onTimeframeChange: (t: NetWorthTimeframe) => void;
  title?: string;
  chartSlot?: ReactNode;
  compactChart?: boolean;
  surface?: "card" | "plain";
};

const TIMES: { id: NetWorthTimeframe; label: string }[] = [
  { id: "all", label: "All" },
  { id: "30d", label: "30d" },
  { id: "7d", label: "7d" },
];

export function NetWorthCard({
  netWorthLabel,
  timeframe,
  onTimeframeChange,
  title = "Exposure and claims",
  chartSlot,
  compactChart = false,
  surface = "card",
}: NetWorthCardProps) {
  return (
    <div
      className={cn(
        "flex h-full flex-col",
        surface === "card"
          ? cn(compactChart ? "p-4" : "p-5", "rounded-2xl border border-border/60 bg-card shadow-sm dark:border-white/[0.08]")
          : undefined,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <div className="flex items-center gap-2">
          <p className="text-lg font-bold tabular-nums tracking-tight text-foreground">{netWorthLabel}</p>
          <Calendar className="size-4 shrink-0 text-muted-foreground opacity-70" aria-hidden />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Chart time range">
        {TIMES.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => onTimeframeChange(id)}
            className={cn(discoverChipPill(), timeframe === id ? discoverChipActive : discoverChipIdle)}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        className={cn(
          "relative mt-2 flex flex-1 flex-col rounded-xl border border-dashed border-border/50 bg-muted/10 dark:border-white/[0.08]",
          compactChart ? "min-h-[6.5rem] sm:min-h-[7.25rem]" : "min-h-[10rem]",
        )}
      >
        {chartSlot ? (
          <div className="relative z-[1] min-h-0 flex-1 px-2 pb-1 pt-2">{chartSlot}</div>
        ) : (
          <svg viewBox="0 0 100 24" preserveAspectRatio="none" className="absolute inset-x-3 bottom-8 h-12 w-[calc(100%-1.5rem)]" aria-hidden>
            <path
              d="M0 12 L100 12"
              className="fill-none stroke-[2] stroke-emerald-500/90 dark:stroke-emerald-400/90"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        )}
        <ChartLabelWatermark variant="portfolio" className="absolute right-2 top-2 z-20 sm:right-3 sm:top-3" />
      </div>
    </div>
  );
}
