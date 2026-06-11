import { ChevronRight, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { yesPercentFromPools, thresholdSubtitle } from "@/lib/discover-utils";
import type { DiscoveryMarket } from "@/types/discovery-market";

type DiscoverRightRailProps = {
  trendingMarkets: DiscoveryMarket[];
  onOpenUpDown: () => void;
  onOpen: (market: DiscoveryMarket) => void;
};

export default function DiscoverRightRail({ trendingMarkets, onOpenUpDown, onOpen }: DiscoverRightRailProps) {
  const list = trendingMarkets.slice(0, 7);

  return (
    <aside className="w-full space-y-5 lg:sticky lg:top-28" aria-label="Discover highlights">
      <div className="rounded-xl border border-border/50 bg-card/80 p-5 dark:bg-card/60">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Crypto thresholds</p>
        <h2 className="mt-2 text-lg font-semibold leading-tight tracking-tight text-foreground">Up or Down</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Short intraday markets on Solana</p>
        <button
          type="button"
          onClick={onOpenUpDown}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:brightness-110"
        >
          Trade now
          <ChevronRight className="size-4 opacity-80" aria-hidden />
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/50 bg-card/80 dark:bg-card/60">
        <div className="flex items-center justify-between border-b border-border/40 px-4 py-3 dark:border-white/[0.06]">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-foreground">Trending</span>
            <TrendingUp className="size-3.5 text-primary" aria-hidden />
          </div>
          <ChevronRight className="size-4 text-muted-foreground/60" aria-hidden />
        </div>
        <ul className="divide-y divide-border/50 dark:divide-white/[0.06]">
          {list.map((market, index) => {
            const yesPct = yesPercentFromPools(market);
            const yesProb = market.outcomes.find((o) => o.id === "yes")?.probability ?? yesPct;
            const skew = Math.round(yesProb - 50);
            const trendUp = skew >= 0;
            return (
              <li key={market.id}>
                <button
                  type="button"
                  onClick={() => onOpen(market)}
                  className="flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                >
                  <span className="w-5 shrink-0 pt-0.5 text-center text-[13px] font-medium tabular-nums text-muted-foreground">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-foreground">{market.title}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{thresholdSubtitle(market)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[15px] font-semibold tabular-nums text-foreground">{yesProb}%</div>
                    <div
                      className={cn(
                        "mt-0.5 flex items-center justify-end gap-0.5 text-[11px] font-semibold tabular-nums",
                        trendUp ? "text-up" : "text-down",
                      )}
                    >
                      <span aria-hidden>{trendUp ? "▲" : "▼"}</span>
                      {Math.abs(skew)}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
