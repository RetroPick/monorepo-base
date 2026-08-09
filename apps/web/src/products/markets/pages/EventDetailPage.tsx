import { Link, useParams } from "react-router-dom";

import { DataStateBanner, DataStateEmpty, StaleBanner } from "../components/DataState";
import { FreshnessBadge } from "../components/FreshnessBadge";
import { MarketsShellLayout } from "../components/MarketsShellLayout";
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
      <MarketsShellLayout>
        <DataStateEmpty
          title="Invalid event identifier"
          description="Event links must use a RetroPick canonical ID (polymarket:event:…)."
          action={
            <Link to={discoverPath()} className="text-sm text-primary hover:underline">
              Back to Discover
            </Link>
          }
        />
      </MarketsShellLayout>
    );
  }

  return (
    <MarketsShellLayout>
      <Breadcrumbs eventId={decodedId} eventTitle={event.data?.title} />

      <DataStateBanner error={event.error} onRetry={() => event.refetch()} />

      {event.isLoading ? <p className="text-sm text-muted-foreground">Loading event…</p> : null}

      {event.data ? (
        <div className="space-y-8">
          {isDegradedFreshness(event.data.freshness) ? <StaleBanner /> : null}
          <header className="space-y-3 border-b border-border/50 pb-6 dark:border-white/[0.08]">
            <FreshnessBadge freshness={event.data.freshness} marketStatus={event.data.status} />
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">{event.data.title}</h1>
            {event.data.description ? (
              <p className="max-w-3xl whitespace-pre-wrap text-muted-foreground">{event.data.description}</p>
            ) : null}
          </header>

          <section>
            <h2 className="mb-4 text-lg font-semibold">Markets ({event.data.markets.length})</h2>
            {event.data.markets.length === 0 ? (
              <DataStateEmpty title="No markets for this event" />
            ) : (
              <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2" role="list">
                {event.data.markets.map((market) => (
                  <li key={market.id}>
                    <Link
                      to={marketPath(market.id)}
                      className="block rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition hover:border-primary/40 dark:border-white/[0.08]"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="font-medium leading-snug text-foreground">{market.question}</p>
                        <FreshnessBadge freshness={market.freshness} marketStatus={market.status} />
                      </div>
                      {market.outcomes[0]?.price ? (
                        <p className="mt-3 text-sm text-muted-foreground">
                          Lead outcome:{" "}
                          <span className="font-semibold tabular-nums text-foreground">
                            {formatProbability(market.outcomes[0].price)}
                          </span>
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
    </MarketsShellLayout>
  );
}

export default EventDetailPage;
