import { Market } from "@/types/market";
import { CLAIMABLE_ROUNDS, PORTFOLIO_SUMMARY } from "@/data/v1App";

export function MyPositionPanel({ market }: { market: Market }) {
  return (
    <div className="rounded-[28px] border border-border/70 bg-card p-6 shadow-[0_24px_80px_-60px_rgba(5,12,30,0.85)]">
      <h3 className="text-lg font-semibold text-foreground">My Position</h3>
      <div className="mt-4 space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Active rounds</span>
          <span className="font-semibold text-foreground">{PORTFOLIO_SUMMARY.activeRounds}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Pending claims</span>
          <span className="font-semibold text-accent-cyan">{PORTFOLIO_SUMMARY.pendingClaimAmount}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Settled PnL</span>
          <span className="font-semibold text-emerald-500">{PORTFOLIO_SUMMARY.settledPnL}</span>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-border/70 bg-background/75 p-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Focus market
        </div>
        <div className="mt-2 text-sm font-semibold text-foreground">{market.title}</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Claimable rounds linked to this wallet update after settlement.
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {CLAIMABLE_ROUNDS.map((round) => (
          <div key={round.id} className="rounded-2xl border border-border/70 bg-background/75 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-foreground">{round.market}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {round.id} · {round.side}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-accent-cyan">{round.amount}</div>
                <div className="text-xs text-emerald-500">{round.result}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
