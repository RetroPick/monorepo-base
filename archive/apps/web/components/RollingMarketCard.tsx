import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, PauseCircle, PlayCircle, RefreshCw } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Market } from "@/types/market";
import { rollingPhaseLabel, rollingStatusLabel } from "@/lib/market-data/discoverMarketClassification";

type RollingMarketCardProps = {
  market: Market;
  href: string;
};

function toEpochLabel(n: number | null | undefined): string {
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0) return "—";
  return `#${n}`;
}

export const RollingMarketCard = memo(({ market, href }: RollingMarketCardProps) => {
  const navigate = useNavigate();

  const phase = market.chainRollingPhase;
  const haltReason = market.chainRollingHaltReason;
  const status = rollingStatusLabel({ phase, haltReason });
  const isHalted = status === "Halted";

  const activeEpoch = market.chainActiveEpochId;
  const nextEpoch = market.chainRollingNextEpochId;

  const handleOpen = () => navigate(href);

  return (
    <div
      role="button"
      tabIndex={0}
      data-testid="rolling-market-card"
      onClick={handleOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleOpen();
        }
      }}
      className={cn(
        "group relative flex w-full min-h-0 cursor-pointer flex-col overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm outline-none transition-colors duration-200",
        "hover:border-border hover:bg-muted/20 focus-visible:ring-2 focus-visible:ring-ring dark:border-white/[0.08] dark:bg-card dark:hover:bg-card/90",
        "min-h-[200px] shrink-0 sm:h-[212px] sm:max-h-[212px]",
        "p-1 dark:border-white/[0.06] sm:p-1.5",
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border/40 bg-background/60 p-2.5 dark:border-white/[0.06] dark:bg-card/40">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em]",
                  isHalted
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300"
                    : "border-primary/25 bg-primary/10 text-primary",
                )}
              >
                {isHalted ? <PauseCircle className="size-3" aria-hidden /> : <PlayCircle className="size-3" aria-hidden />}
                Rolling
              </span>
              <span className="text-[10px] font-semibold text-muted-foreground">{status}</span>
            </div>
            <h3 className="mt-2 line-clamp-2 text-left text-[12px] font-semibold leading-snug tracking-tight text-foreground group-hover:text-primary sm:text-[13px]">
              {market.title}
            </h3>
          </div>
          <div className="shrink-0 rounded-full border border-border/60 bg-background/70 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground dark:border-white/[0.08] dark:bg-muted/40">
            {rollingPhaseLabel(phase)}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-border/40 bg-card/60 px-2.5 py-2 dark:border-white/[0.06]">
            <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Active epoch</div>
            <div className="mt-1 text-sm font-semibold tabular-nums text-foreground">{toEpochLabel(activeEpoch)}</div>
          </div>
          <div className="rounded-lg border border-border/40 bg-card/60 px-2.5 py-2 dark:border-white/[0.06]">
            <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Next epoch</div>
            <div className="mt-1 text-sm font-semibold tabular-nums text-foreground">{toEpochLabel(nextEpoch)}</div>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2 border-t border-border/40 pt-2 text-xs dark:border-white/[0.08]">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground">
              <RefreshCw className="size-3.5 opacity-70" aria-hidden />
              <span className="truncate tabular-nums">Pool {market.totalPool || market.volume || "-"}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleOpen();
            }}
            disabled={isHalted || activeEpoch == null}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors",
              isHalted || activeEpoch == null
                ? "border-border/60 bg-muted/40 text-muted-foreground"
                : "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15",
            )}
          >
            {isHalted ? "Halted" : activeEpoch == null ? "No epoch" : "Enter"}
            <ArrowRight className="size-3.5" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
});

RollingMarketCard.displayName = "RollingMarketCard";

