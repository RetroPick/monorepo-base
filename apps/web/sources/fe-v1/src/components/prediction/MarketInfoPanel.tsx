import { Market } from "@/types/market";

export function MarketInfoPanel({ market }: { market: Market }) {
  return (
    <div className="rounded-[28px] border border-border/70 bg-card p-6 shadow-[0_24px_80px_-60px_rgba(5,12,30,0.85)]">
      <h3 className="text-lg font-semibold text-foreground">Market Info</h3>
      <div className="mt-4 space-y-4 text-sm">
        <div className="flex items-start justify-between gap-4">
          <span className="text-muted-foreground">Oracle source</span>
          <span className="text-right font-semibold text-foreground">{market.oracleSource}</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <span className="text-muted-foreground">Lock rule</span>
          <span className="max-w-[220px] text-right font-semibold text-foreground">{market.lockRule}</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <span className="text-muted-foreground">Close rule</span>
          <span className="max-w-[220px] text-right font-semibold text-foreground">{market.closeRule}</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <span className="text-muted-foreground">Settlement</span>
          <span className="text-right font-semibold text-foreground">{market.settlementLabel}</span>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-border/70 bg-background/75 p-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Invalid / refund rule
        </div>
        <div className="mt-2 text-sm leading-6 text-muted-foreground">
          {market.invalidationRule}
        </div>
      </div>
    </div>
  );
}
