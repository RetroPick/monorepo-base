import { Link } from "react-router-dom";
import { chainDetailPath } from "@/lib/market-data/chainDiscover";
import { useWorldCupAwards } from "../hooks/useWorldCupAwards";
import { WorldCupEmptyState } from "./WorldCupEmptyState";
import { marketRowToCardMarket } from "@/lib/market-data/chainDiscover";

export default function WorldCupAwardsSpecials() {
  const awardsQ = useWorldCupAwards();
  const awards = awardsQ.data ?? [];

  if (awardsQ.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading awards…</p>;
  }

  return (
    <section data-testid="world-cup-awards-specials">
      <div className="mb-4 text-center sm:text-left">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Awards &amp; Specials</h2>
        <p className="text-sm text-muted-foreground">Special prediction markets beyond team progression.</p>
      </div>

      {awards.length === 0 ? (
        <WorldCupEmptyState
          title="No awards markets yet"
          description="Award and special markets appear when indexed with world_cup vertical and non-LADDER templates."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {awards.map((row) => {
            const card = marketRowToCardMarket(row);
            return (
              <Link
                key={row.templateId}
                to={chainDetailPath(row.templateId)}
                className="block rounded-xl border border-border/60 bg-card p-4 transition-colors hover:border-primary/40"
              >
                <h3 className="text-sm font-semibold text-foreground">{card.title}</h3>
                {card.description ? (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{card.description}</p>
                ) : null}
                <span className="mt-3 inline-block text-xs font-semibold text-primary">Open market →</span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
