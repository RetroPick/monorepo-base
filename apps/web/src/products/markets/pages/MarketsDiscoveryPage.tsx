import { Link } from "react-router-dom";

import { DataStateBanner, DataStateEmpty, ProvenanceFooter } from "../components/DataState";
import { EventCard } from "../components/EventCard";
import { FreshnessBadge } from "../components/FreshnessBadge";
import { MarketsShell } from "../components/MarketsShell";
import {
  useMarketsCapabilities,
  useMarketsEligibility,
  useMarketsEventsInfinite,
} from "../hooks/useMarketsQueries";

export default function MarketsDiscoveryPage() {
  const eligibility = useMarketsEligibility();
  const capabilities = useMarketsCapabilities();
  const events = useMarketsEventsInfinite();

  const allEvents = events.data?.pages.flatMap((p) => p.events) ?? [];
  const listFreshness = events.data?.pages[0]?.freshness;
  const listProvenance = events.data?.pages[0]?.provenance;
  const loading = events.isLoading || capabilities.isLoading;
  const error = events.error ?? capabilities.error;

  return (
    <MarketsShell>
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Discover</h2>
          <p className="text-sm text-muted-foreground">
            Polymarket events via RetroPick BFF. Trading is disabled in this phase.
          </p>
        </div>

        {eligibility.data && !eligibility.data.eligible ? (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            Future trading may be unavailable in your region: {eligibility.data.reason ?? "ineligible"}
          </div>
        ) : null}

        {capabilities.data ? (
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded border border-border px-2 py-1">
              Catalog: {capabilities.data.catalog ? "on" : "off"}
            </span>
            <span className="rounded border border-border px-2 py-1">
              Trading: off
            </span>
            <span className="rounded border border-border px-2 py-1">
              Realtime: {capabilities.data.features?.realtime ? "on" : "off (polling)"}
            </span>
          </div>
        ) : null}

        {listFreshness ? (
          <FreshnessBadge freshness={listFreshness} />
        ) : null}

        <DataStateBanner error={error} onRetry={() => events.refetch()} />

        {loading ? <p className="text-sm text-muted-foreground">Loading events…</p> : null}

        {!loading && !error && allEvents.length === 0 ? (
          <DataStateEmpty
            title="No events in catalog"
            description="Check MARKETS_CATALOG_ENABLED and backend Gamma connectivity."
          />
        ) : null}

        <ul className="space-y-3" role="list">
          {allEvents.map((event) => (
            <li key={event.id}>
              <EventCard event={event} />
            </li>
          ))}
        </ul>

        {events.hasNextPage ? (
          <button
            type="button"
            className="w-full rounded-lg border border-border py-2 text-sm font-medium hover:bg-muted"
            disabled={events.isFetchingNextPage}
            onClick={() => events.fetchNextPage()}
          >
            {events.isFetchingNextPage ? "Loading…" : "Load more"}
          </button>
        ) : null}

        <ProvenanceFooter
          source={listProvenance?.source}
          observedAt={listProvenance?.observedAt}
        />
      </div>
    </MarketsShell>
  );
}
