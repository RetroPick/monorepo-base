import { Link } from "react-router-dom";
import { useWorldCupMarkets } from "../hooks/useWorldCupMarkets";
import { WorldCupFlagIcon } from "./WorldCupFlagIcon";
import { WorldCupEmptyState } from "./WorldCupEmptyState";
import { cn } from "@/lib/utils";

export default function WorldCupBracketView() {
  const marketsQ = useWorldCupMarkets();
  const markets = marketsQ.data ?? [];

  if (marketsQ.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading bracket…</p>;
  }

  if (markets.length === 0) {
    return (
      <WorldCupEmptyState
        title="Bracket markets not indexed yet"
        description="Knockout progression paths appear when team LADDER markets are published. Each node links to its prediction market."
      />
    );
  }

  const sorted = [...markets].sort((a, b) => (b.row.outcomes?.[6]?.impliedProbabilityE6 ?? "0").localeCompare(
    a.row.outcomes?.[6]?.impliedProbabilityE6 ?? "0",
  ));

  return (
    <section data-testid="world-cup-bracket">
      <div className="mb-4">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Tournament bracket</h2>
        <p className="text-sm text-muted-foreground">
          Forecast each team&apos;s path through the tournament. Tap a team to open its progression market.
        </p>
      </div>

      <div className="overflow-x-auto">
        <div className="flex min-w-max gap-6 pb-4">
          {["Round of 32", "Quarter-final", "Semi-final", "Final"].map((round, roundIdx) => (
            <div key={round} className="w-48 shrink-0">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{round}</h3>
              <div className="flex flex-col gap-3">
                {sorted
                  .filter((_, i) => i % 4 === roundIdx % 4)
                  .slice(0, 4)
                  .map((market) => {
                    const pct = market.row.outcomes?.find((o) => o.outcomeIndex === 6);
                    const percent = pct?.impliedProbabilityE6
                      ? Math.round(Number(pct.impliedProbabilityE6) / 10_000)
                      : null;
                    return (
                      <Link
                        key={market.templateId}
                        to={market.route}
                        className={cn(
                          "block rounded-lg border border-border/60 bg-card px-3 py-2 transition-colors hover:border-primary/40",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <WorldCupFlagIcon code={market.teamCode} />
                          <span className="truncate text-xs font-semibold text-foreground">{market.teamName}</span>
                        </div>
                        {percent != null ? (
                          <p className="mt-1 text-[10px] tabular-nums text-primary">{percent}% champion forecast</p>
                        ) : null}
                      </Link>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
