import { Calendar, Share2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { discoverChipActive, discoverChipIdle, discoverChipPill } from "@/lib/ui/discover-chip-styles";

export type NetWorthTimeframe = "all" | "30d" | "7d";

export type NetWorthCardProps = {
  netWorthLabel: string;
  timeframe: NetWorthTimeframe;
  onTimeframeChange: (t: NetWorthTimeframe) => void;
  volumeLabel: string;
  profitLabel: string;
  profitPositive?: boolean;
  chartHint?: string;
  /** Card heading (default "Net Worth"). */
  title?: string;
  /** Show volume/profit pills and share (default true). */
  showSecondaryMetrics?: boolean;
  /** Smaller chart area for above-fold dashboard rows. */
  compactChart?: boolean;
  /** `plain` drops outer card chrome when nested in a unified dashboard shell */
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
  volumeLabel,
  profitLabel,
  profitPositive = true,
  chartHint = "Historical chart when indexer snapshots are available. Totals reflect live on-chain views today.",
  title = "Net Worth",
  showSecondaryMetrics = true,
  compactChart = false,
  surface = "card",
}: NetWorthCardProps) {
  return (
    <div
      className={cn(
        "flex h-full flex-col",
        surface === "card"
          ? cn(
              compactChart ? "p-4" : "p-5",
              "rounded-2xl border border-border/60 bg-card shadow-sm dark:border-white/[0.08]",
            )
          : undefined,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <div className="flex items-center gap-2">
          <p className="text-lg font-bold tabular-nums tracking-tight text-foreground">{netWorthLabel}</p>
          <span className="sr-only">Current reference value</span>
          <Calendar className="size-4 shrink-0 text-muted-foreground opacity-70" aria-hidden />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Chart time range">
        {TIMES.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => onTimeframeChange(id)}
            className={cn(
              discoverChipPill(),
              timeframe === id ? discoverChipActive : discoverChipIdle,
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {showSecondaryMetrics ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-border/60 px-3 py-1 text-[11px] font-semibold tabular-nums text-muted-foreground dark:border-white/[0.12]">
            Volume {volumeLabel}
            <span className="ml-2 text-foreground/70">Rank —</span>
          </span>
          <span className="inline-flex items-center rounded-full border border-border/60 px-3 py-1 text-[11px] font-semibold tabular-nums dark:border-white/[0.12]">
            Profit{" "}
            <span className={cn("ml-1 tabular-nums", profitPositive ? "text-emerald-500 dark:text-emerald-400" : "")}>
              {profitLabel}
            </span>
            <span className="ml-2 text-muted-foreground">Rank —</span>
          </span>
          <button
            type="button"
            className="ml-auto inline-flex size-8 items-center justify-center rounded-full border border-border/35 text-muted-foreground backdrop-blur-md transition-[background-color,color] hover:bg-muted/50 hover:text-foreground dark:border-white/[0.12]"
            aria-label="Share portfolio summary"
            onClick={() => {
              if (navigator.share) {
                void navigator.share({ title: "Portfolio", text: `Net worth ${netWorthLabel}` }).catch(() => {});
              }
            }}
          >
            <Share2 className="size-4" />
          </button>
        </div>
      ) : null}
      <div
        className={cn(
          "relative flex flex-1 items-center justify-center rounded-xl border border-dashed border-border/50 bg-muted/10 dark:border-white/[0.08]",
          compactChart ? "mt-2 min-h-[13rem] sm:min-h-[15rem]" : "mt-4 min-h-[10rem]",
        )}
      >
        <svg
          viewBox="0 0 100 24"
          preserveAspectRatio="none"
          className={cn(
            "absolute inset-x-3 overflow-visible",
            compactChart
              ? "top-1/2 h-12 w-[calc(100%-1.5rem)] -translate-y-1/2"
              : "bottom-8 h-12 w-[calc(100%-1.5rem)]",
          )}
          aria-hidden
        >
          <path
            d="M0 12 L100 12"
            className="fill-none stroke-[2] stroke-emerald-500/90 dark:stroke-emerald-400/90"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <div className={cn("pointer-events-none select-none text-center", compactChart && "px-1")}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">RetroPick</p>
          <p
            className={cn(
              "max-w-[16rem] text-muted-foreground/80",
              compactChart ? "mt-1 text-[10px] leading-snug" : "mt-2 text-[11px] leading-relaxed",
            )}
          >
            {chartHint}
          </p>
        </div>
      </div>
    </div>
  );
}
