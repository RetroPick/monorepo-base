import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { DataStateBanner, DataStateEmpty } from "@/features/markets/components/DataState";
import { useMarketsCapabilities, useMarketsSignals } from "@/features/markets/hooks/useMarketsQueries";

export default function SignalsPolymarket() {
  const capabilities = useMarketsCapabilities();
  const intelligence = capabilities.data?.intelligence === true;
  const signals = useMarketsSignals();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-[1440px] px-5 pb-20 pt-10 lg:px-10">
        <h1 className="text-2xl font-semibold tracking-tight">Signals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Deterministic catalog-driven signals when intelligence capability is enabled.
        </p>

        <DataStateBanner error={capabilities.error} onRetry={() => capabilities.refetch()} />

        {!intelligence ? (
          <p className="mt-6 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            Signals are not enabled on this deployment.
          </p>
        ) : (
          <>
            <DataStateBanner error={signals.error} onRetry={() => signals.refetch()} />
            {signals.isLoading ? <p className="mt-4 text-sm text-muted-foreground">Loading signals…</p> : null}
            {!signals.isLoading && signals.data?.signals.length === 0 ? (
              <DataStateEmpty title="No signals" />
            ) : null}
            <ul className="mt-6 space-y-2">
              {signals.data?.signals.map((signal) => (
                <li key={signal.id} className="rounded-lg border border-border bg-card p-4 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium capitalize">{signal.type.replace("_", " ")}</span>
                    <span className="text-xs text-muted-foreground">{signal.state}</span>
                  </div>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">{signal.marketId}</p>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
