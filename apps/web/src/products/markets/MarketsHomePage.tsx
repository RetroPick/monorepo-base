import { useMarketsCapabilities, useMarketsEligibility, useMarketsEvents } from "./hooks/useMarketsPlatform";

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-right">{value}</span>
    </div>
  );
}

export default function MarketsHomePage() {
  const eligibility = useMarketsEligibility();
  const capabilities = useMarketsCapabilities();
  const events = useMarketsEvents();

  const loading = eligibility.isLoading || capabilities.isLoading || events.isLoading;
  const error = eligibility.error || capabilities.error || events.error;

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col gap-6 px-6 py-16">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          RetroPick Markets
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Polymarket discovery &amp; trading</h1>
        <p className="mt-2 text-muted-foreground">
          Connected to the Markets BFF. Legacy epoch MarketEngine routes live under
          {" "}
          <code className="text-xs">/api/v1/legacy/markets</code>.
        </p>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading platform status…</p> : null}
      {error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Could not reach Markets API. Start the Go backend or set NEXT_PUBLIC_API_URL.
        </p>
      ) : null}

      {eligibility.data ? (
        <section className="rounded-lg border p-4">
          <h2 className="mb-2 font-medium">Eligibility</h2>
          <StatusRow label="Eligible" value={eligibility.data.eligible ? "yes" : "no"} />
          <StatusRow label="Reason" value={eligibility.data.reason ?? "—"} />
        </section>
      ) : null}

      {capabilities.data ? (
        <section className="rounded-lg border p-4">
          <h2 className="mb-2 font-medium">Capabilities</h2>
          <StatusRow label="API version" value={capabilities.data.version} />
          <StatusRow label="Catalog" value={capabilities.data.catalog ? "on" : "off"} />
          <StatusRow label="Trading" value={capabilities.data.trading ? "on" : "off"} />
        </section>
      ) : null}

      {events.data ? (
        <section className="rounded-lg border p-4">
          <h2 className="mb-2 font-medium">Events catalog</h2>
          <StatusRow label="Source" value={events.data.source} />
          <StatusRow label="Count" value={String(events.data.events.length)} />
          {events.data.events.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No events returned. Check MARKETS_CATALOG_ENABLED and Gamma connectivity on the backend.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {events.data.events.slice(0, 12).map((event) => (
                <li key={event.id} className="rounded-md border border-border/60 px-3 py-2 text-sm">
                  <p className="font-medium leading-snug">{event.title}</p>
                  {event.slug ? (
                    <p className="mt-1 font-mono text-xs text-muted-foreground">{event.slug}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </main>
  );
}
