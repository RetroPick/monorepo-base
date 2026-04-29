import { cn } from "@/lib/utils";

import { ProfileCard } from "@/features/portfolio/ProfileCard";

const ROI_BUCKETS = ["> 500%", "200% – 500%", "0% – 200%", "< 0%"] as const;

export type PortfolioOverviewCardProps = {
  totalValueLabel: string;
  unrealizedPnlLabel: string;
  tradeableBalanceLabel: string;
  totalPnlLabel: string;
  indexedEventsCount: number;
  claimsCount: number;
  address: string | undefined;
  isConnected: boolean;
  /** `plain` drops outer card chrome when nested in a unified dashboard shell */
  surface?: "card" | "plain";
};

function StatRow({ label, value, dense }: { label: string; value: string; dense?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-2 border-b border-border/40 last:border-b-0 dark:border-white/[0.06]",
        dense ? "py-1.5" : "py-2.5",
      )}
    >
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-bold tabular-nums tracking-tight text-foreground">{value}</span>
    </div>
  );
}

export function PortfolioOverviewCard({
  totalValueLabel,
  unrealizedPnlLabel,
  tradeableBalanceLabel,
  totalPnlLabel,
  indexedEventsCount,
  claimsCount,
  address,
  isConnected,
  surface = "card",
}: PortfolioOverviewCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col",
        surface === "card"
          ? "rounded-2xl border border-border/60 bg-card p-4 shadow-sm dark:border-white/[0.08]"
          : "",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Overview</h2>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">USD</span>
      </div>

      <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Balance</p>
      <div className="mt-1">
        <StatRow dense label="Total value" value={totalValueLabel} />
        <StatRow dense label="Unrealized PNL" value={unrealizedPnlLabel} />
        <StatRow dense label="Tradeable balance" value={tradeableBalanceLabel} />
      </div>

      <div className="mt-3 border-t border-border/50 pt-3 dark:border-white/[0.06]">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Performance</p>
        <div className="mt-1 space-y-1.5 text-xs">
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Total PnL</span>
            <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{totalPnlLabel}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Total TXNS</span>
            <span className="font-mono tabular-nums text-foreground">
              {indexedEventsCount} <span className="text-muted-foreground">/ {claimsCount} claims</span>
            </span>
          </div>
        </div>
        <details className="mt-2">
          <summary className="cursor-pointer list-none text-[10px] text-muted-foreground underline decoration-dotted underline-offset-2 [&::-webkit-details-marker]:hidden">
            Return distribution (analytics pending)
          </summary>
          <ul className="mt-2 space-y-0.5 border-t border-border/40 pt-2 dark:border-white/[0.06]">
            {ROI_BUCKETS.map((label) => (
              <li key={label} className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{label}</span>
                <span className="tabular-nums text-foreground">0</span>
              </li>
            ))}
          </ul>
        </details>
      </div>

      <div className={cn("mt-3 border-t border-border/50 pt-3 dark:border-white/[0.06]")}>
        <ProfileCard address={address} isConnected={isConnected} variant="compact" />
      </div>
    </div>
  );
}
