import { Link, useParams } from "react-router-dom";

import { DataStateBanner, DataStateEmpty, ProvenanceFooter } from "../components/DataState";
import { FreshnessBadge } from "../components/FreshnessBadge";
import { MarketsShell } from "../components/MarketsShell";
import { formatProbability } from "../lib/decimal";
import { useMarketsEvent } from "../hooks/useMarketsQueries";

export default function EventDetailPage() {
  const { eventId = "" } = useParams();
  const decodedId = decodeURIComponent(eventId);
  const event = useMarketsEvent(decodedId);

  return (
    <MarketsShell>
      <div className="space-y-4">
        <Link to="/markets" className="text-sm text-primary hover:underline">
          ← Back to discover
        </Link>

        <DataStateBanner error={event.error} onRetry={() => event.refetch()} />

        {event.isLoading ? <p className="text-sm text-muted-foreground">Loading event…</p> : null}

        {event.data ? (
          <>
            <header className="space-y-2">
              <FreshnessBadge freshness={event.data.freshness} marketStatus={event.data.status} />
              <h2 className="text-xl font-semibold leading-snug">{event.data.title}</h2>
              {event.data.description ? (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{event.data.description}</p>
              ) : null}
            </header>

            <section>
              <h3 className="mb-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Markets ({event.data.markets.length})
              </h3>
              {event.data.markets.length === 0 ? (
                <DataStateEmpty title="No markets for this event" />
              ) : (
                <ul className="space-y-2" role="list">
                  {event.data.markets.map((market) => {
                    const yes = market.outcomes[0];
                    return (
                      <li key={market.id}>
                        <Link
                          to={`/markets/markets/${encodeURIComponent(market.id)}`}
                          className="block rounded-lg border border-border p-3 hover:border-primary/40"
                        >
                          <p className="text-sm font-medium">{market.question}</p>
                          <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span className="capitalize">{market.status}</span>
                            {yes?.price ? (
                              <span className="font-mono text-foreground">
                                {yes.name}: {formatProbability(yes.price)}
                              </span>
                            ) : null}
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <ProvenanceFooter
              source={event.data.provenance.source}
              observedAt={event.data.provenance.observedAt}
            />
          </>
        ) : null}

        {!event.isLoading && !event.data && !event.error ? (
          <DataStateEmpty title="Event not found" />
        ) : null}
      </div>
    </MarketsShell>
  );
}
