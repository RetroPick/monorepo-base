import { MarketsShell } from "../components/MarketsShell";
import { DataStateBanner, DataStateEmpty } from "../components/DataState";
import { useMarketsSignals } from "../hooks/useMarketsQueries";

export default function SignalsPage() {
  const signals = useMarketsSignals();

  return (
    <MarketsShell>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Signals</h2>
        <p className="text-sm text-muted-foreground">
          Deterministic catalog-driven signals. Price and liquidity signals require future producers.
        </p>

        <DataStateBanner error={signals.error} onRetry={() => signals.refetch()} />

        {signals.isLoading ? <p className="text-sm text-muted-foreground">Loading signals…</p> : null}

        {!signals.isLoading && signals.data?.signals.length === 0 ? (
          <DataStateEmpty title="No signals" description="Operational signals appear when catalog changes are detected." />
        ) : null}

        <ul className="space-y-2" role="list">
          {signals.data?.signals.map((signal) => (
            <li key={signal.id} className="rounded-lg border border-border p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium capitalize">{signal.type.replace("_", " ")}</span>
                <span className="text-xs text-muted-foreground">{signal.state}</span>
              </div>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{signal.marketId}</p>
              <time className="mt-1 block text-xs text-muted-foreground" dateTime={signal.createdAt}>
                {new Date(signal.createdAt).toLocaleString()}
              </time>
            </li>
          ))}
        </ul>
      </div>
    </MarketsShell>
  );
}
