import { cn } from "@/lib/utils";

const BUCKETS = ["> 500%", "200% – 500%", "0% – 200%", "< 0%"] as const;

export type PortfolioPerformanceSummaryProps = {
  totalPnlLabel: string;
  realizedPnlLabel: string;
  indexedEventsCount: number;
  claimsCount: number;
};

export function PortfolioPerformanceSummary({
  totalPnlLabel,
  realizedPnlLabel,
  indexedEventsCount,
  claimsCount,
}: PortfolioPerformanceSummaryProps) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm dark:border-white/[0.08] sm:p-5">
      <h2 className="text-sm font-semibold text-foreground">Performance</h2>
      <div className="mt-3 space-y-2 text-xs">
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Total PnL</span>
          <span className="font-semibold tabular-nums text-foreground">{totalPnlLabel}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Realized PNL</span>
          <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{realizedPnlLabel}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Total TXNS</span>
          <span className="font-mono tabular-nums text-foreground">
            {indexedEventsCount} <span className="text-muted-foreground">/ {claimsCount} claims</span>
          </span>
        </div>
      </div>
      <p className="mt-3 text-[10px] text-muted-foreground">Return distribution (requires portfolio analytics).</p>
      <ul className="mt-2 space-y-1">
        {BUCKETS.map((label) => (
          <li key={label} className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{label}</span>
            <span className="tabular-nums text-foreground">0</span>
          </li>
        ))}
      </ul>
      <div
        className={cn(
          "mt-3 h-1 w-full rounded-full bg-gradient-to-r",
          "from-[hsl(var(--accent-magenta)/0.35)] via-border to-transparent dark:from-[hsl(var(--accent-magenta)/0.45)]",
        )}
        aria-hidden
      />
    </div>
  );
}
