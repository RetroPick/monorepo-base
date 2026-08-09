import { Link, useParams } from "react-router-dom";

import { DataStateBanner, DataStateEmpty, StaleBanner } from "../components/DataState";
import { FreshnessBadge } from "../components/FreshnessBadge";
import { MarketsReadLayout } from "../components/MarketsReadLayout";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { useMarketsEvent } from "../hooks/useMarketsQueries";
import { formatProbability } from "../lib/decimal";
import { isDegradedFreshness } from "../lib/freshness";
import { isCanonicalEventId } from "../lib/ids";
import { discoverPath, marketPath } from "../routes/paths";

export function EventDetailPage() {
  const { eventId = "" } = useParams();
  const decodedId = decodeURIComponent(eventId);
  const idValid = isCanonicalEventId(decodedId);
  const event = useMarketsEvent(decodedId);

  if (!idValid) {
    return (
      <MarketsReadLayout>
        <DataStateEmpty
          title="Invalid event identifier"
          description="Event links must use a RetroPick canonical ID (polymarket:event:…)."
          action={
            <Link to={discoverPath()} className="text-sm text-primary hover:underline">
              Back to Discover
            </Link>
          }
        />
      </MarketsReadLayout>
    );
  }

  return (
    <MarketsReadLayout>
      <Breadcrumbs eventId={decodedId} eventTitle={event.data?.title} />

      <DataStateBanner error={event.error} onRetry={() => event.refetch()} />

      {event.isLoading ? <p className="text-sm text-muted-foreground">Loading event…</p> : null}

      {event.data ? (
        <div className="space-y-6">
          {isDegradedFreshness(event.data.freshness) ? <StaleBanner /> : null}
          <header className="space-y-2">
            <FreshnessBadge freshness={event.data.freshness} marketStatus={event.data.status} />
            <h1 className="text-3xl font-semibold tracking-tight">{event.data.title}</h1>
            <p className="font-mono text-xs text-muted-foreground">{event.data.id}</p>
            {event.data.description ? (
              <p className="max-w-3xl whitespace-pre-wrap text-muted-foreground">{event.data.description}</p>
            ) : null}
          </header>

          <section>
            <h2 className="mb-4 text-lg font-semibold">Markets ({event.data.markets.length})</h2>
            {event.data.markets.length === 0 ? (
              <DataStateEmpty title="No markets for this event" />
            ) : (
              <ul className="space-y-3" role="list">
                {event.data.markets.map((market) => (
                  <li key={market.id}>
                    <Link
                      to={marketPath(market.id)}
                      className="block rounded-xl border border-border bg-card p-4 hover:border-primary/40"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="font-medium">{market.question}</p>
                        <FreshnessBadge freshness={market.freshness} marketStatus={market.status} />
                      </div>
                      <p className="mt-1 font-mono text-xs text-muted-foreground">{market.id}</p>
                      {market.outcomes[0]?.price ? (
                        <p className="mt-2 text-sm text-muted-foreground">
                          Lead outcome: {formatProbability(market.outcomes[0].price)}
                        </p>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}

      {!event.isLoading && !event.data && !event.error ? (
        <DataStateEmpty
          title="Event not found"
          action={
            <Link to={discoverPath()} className="text-sm text-primary hover:underline">
              Back to Discover
            </Link>
          }
        />
      ) : null}
    </MarketsReadLayout>
  );
}

export default EventDetailPage;
