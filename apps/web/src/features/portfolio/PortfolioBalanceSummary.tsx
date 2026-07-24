import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type PortfolioBalanceSummaryProps = {
  totalValueLabel: string;
  unrealizedPnlLabel: string;
  tradeableBalanceLabel: string;
  /** e.g. ProfileCard */
  footer?: ReactNode;
};

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-border/40 py-2.5 last:border-b-0 dark:border-white/[0.06]">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-right text-base font-bold tabular-nums tracking-tight text-foreground">{value}</span>
    </div>
  );
}

export function PortfolioBalanceSummary({
  totalValueLabel,
  unrealizedPnlLabel,
  tradeableBalanceLabel,
  footer,
}: PortfolioBalanceSummaryProps) {
  return (
    <div className="flex flex-col rounded-2xl border border-border/60 bg-card p-5 shadow-sm dark:border-white/[0.08]">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Balance</h2>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">USD</span>
      </div>
      <div className="mt-3">
        <StatRow label="Total value" value={totalValueLabel} />
        <StatRow label="Unrealized PNL" value={unrealizedPnlLabel} />
        <StatRow label="Tradeable balance" value={tradeableBalanceLabel} />
      </div>
      {footer ? <div className={cn("mt-4 border-t border-border/50 pt-4 dark:border-white/[0.06]")}>{footer}</div> : null}
    </div>
  );
}
