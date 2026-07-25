import { useWorldCupMatches } from "../hooks/useWorldCupMatches";
import { useWorldCupMarkets } from "../hooks/useWorldCupMarkets";
import WorldCupMatchCard from "./WorldCupMatchCard";
import WorldCupMarketCard from "./WorldCupMarketCard";
import { WorldCupEmptyState } from "./WorldCupEmptyState";

export default function WorldCupMatchesAndFutures() {
  const matchesQ = useWorldCupMatches();
  const marketsQ = useWorldCupMarkets();
  const matches = matchesQ.data ?? [];
  const markets = marketsQ.data ?? [];

  const isLoading = matchesQ.isLoading || marketsQ.isLoading;

  return (
    <section data-testid="world-cup-matches-futures">
      <div className="mb-4">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Matches &amp; Futures</h2>
        <p className="text-sm text-muted-foreground">Upcoming fixtures and tournament progression markets.</p>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}

      {!isLoading && matches.length > 0 ? (
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {matches.map((match) => (
            <WorldCupMatchCard key={match.id} match={match} />
          ))}
        </div>
      ) : null}

      {!isLoading && markets.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {markets.slice(0, 8).map((market) => (
            <WorldCupMarketCard key={market.templateId} market={market} />
          ))}
        </div>
      ) : null}

      {!isLoading && matches.length === 0 && markets.length === 0 ? (
        <WorldCupEmptyState
          title="No matches or futures yet"
          description="Match markets use slug pattern world-cup-*-match-*; progression markets use world-cup-*-progression."
        />
      ) : null}
    </section>
  );
}
