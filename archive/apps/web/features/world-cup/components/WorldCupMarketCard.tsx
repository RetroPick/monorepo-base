import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { WorldCupParsedMarket } from "../types/worldCup.types";
import { WorldCupFlagIcon } from "./WorldCupFlagIcon";
import { WorldCupProbabilityBar } from "./WorldCupProbabilityBar";
import { WORLD_CUP_LADDER_OUTCOMES } from "../lib/worldCupOutcomes";

type WorldCupMarketCardProps = {
  market: WorldCupParsedMarket;
  className?: string;
};

function championPercent(market: WorldCupParsedMarket): number | null {
  const champion = market.row.outcomes?.find((o) => o.outcomeIndex === 6);
  if (!champion?.impliedProbabilityE6) return null;
  const e6 = Number(champion.impliedProbabilityE6);
  if (!Number.isFinite(e6)) return null;
  return Math.round(e6 / 10_000);
}

export default function WorldCupMarketCard({ market, className }: WorldCupMarketCardProps) {
  const percent = championPercent(market);
  const statusLabel =
    market.status === "open"
      ? "Open"
      : market.status === "locked"
        ? "Locked"
        : market.status === "resolved"
          ? "Resolved"
          : "Syncing";

  return (
    <Link
      to={market.route}
      className={cn(
        "block rounded-xl border border-border/60 bg-card p-4 transition-colors hover:border-primary/40 hover:bg-card/90",
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {market.teamCode ? <WorldCupFlagIcon code={market.teamCode} className="h-4 w-5" /> : null}
          <span className="truncate text-sm font-semibold text-foreground">{market.teamName}</span>
        </div>
        <span className="shrink-0 rounded-full border border-border/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {statusLabel}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">How far will this team go?</p>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Champion forecast</span>
        <span className="font-semibold tabular-nums text-foreground">
          {percent != null ? `${percent}%` : "—"}
        </span>
      </div>
      <WorldCupProbabilityBar percent={percent} className="mt-2" />
      <p className="mt-3 text-[10px] text-muted-foreground">
        {WORLD_CUP_LADDER_OUTCOMES.length} progression outcomes · Predict path
      </p>
    </Link>
  );
}
