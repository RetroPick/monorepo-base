import { cn } from "@/shared/lib/utils";

import { ProfileCard } from "./ProfileCard";

export type PortfolioOverviewCardProps = {
  totalValueLabel: string;
  unrealizedPnlLabel: string;
  tradeableBalanceLabel: string;
  totalPnlLabel: string;
  indexedEventsCount: number;
  claimsCount: number;
  isConnected: boolean;
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
  isConnected,
  surface = "card",
}: PortfolioOverviewCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col",
        surface === "card" ? "rounded-2xl border border-border/60 bg-card p-4 shadow-sm dark:border-white/[0.08]" : "",
      )}
    >
      <div className="pb-1">
        <ProfileCard isConnected={isConnected} variant="compact" />
      </div>

      <div className="mt-3 border-t border-border/50 pt-3 dark:border-white/[0.06]">
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
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  totalPnlLabel.startsWith("-")
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-emerald-600 dark:text-emerald-400",
                )}
              >
                {totalPnlLabel}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Total TXNS</span>
              <span className="font-mono tabular-nums text-foreground">
                {indexedEventsCount} <span className="text-muted-foreground">/ {claimsCount} claims</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
