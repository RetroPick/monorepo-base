import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import {
  apiErrorSummary,
  fetchHealth,
  fetchMarkets,
  getApiBaseUrl,
  type MarketRow,
} from "@/lib/api/retropickApi";
import { useIndexerWebSocket } from "@/hooks/useIndexerWebSocket";

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-mono text-foreground">{v}</dd>
    </div>
  );
}

type MarketFilter = "active" | "all";

function isPublishedActive(market: MarketRow) {
  return market.initialized && market.activeEpochId != null;
}

function StatusPill({ market }: { market: MarketRow }) {
  if (isPublishedActive(market)) {
    return (
      <span className="inline-flex items-center rounded-full border border-emerald-400/35 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-300">
        Active epoch #{market.activeEpochId}
      </span>
    );
  }
  if (market.initialized) {
    return (
      <span className="inline-flex items-center rounded-full border border-amber-400/35 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-300">
        Published · no active epoch
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs font-medium text-muted-foreground">
      Template only
    </span>
  );
}

export default function ChainMarkets() {
  useIndexerWebSocket(true);

  const apiBase = getApiBaseUrl();

  const healthQ = useQuery({
    queryKey: ["retropick-api", "health"],
    queryFn: fetchHealth,
    staleTime: 5_000,
  });

  const marketsQ = useQuery({
    queryKey: ["retropick-api", "markets"],
    queryFn: fetchMarkets,
    staleTime: 5_000,
  });

  const health = healthQ.data;
  const markets: MarketRow[] = marketsQ.data ?? [];
  const err = healthQ.error ?? marketsQ.error;
  const [filter, setFilter] = useState<MarketFilter>("active");
  const activeMarkets = useMemo(() => markets.filter(isPublishedActive), [markets]);
  const visibleMarkets = filter === "active" ? activeMarkets : markets;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-10 lg:px-8">
        <header>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Indexed markets
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">RetroPick chain</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            API: <span className="font-mono text-xs">{apiBase}</span> — Go indexer REST (
            <code className="text-xs">/api/v1/markets</code>, etc.).
          </p>
        </header>

        {err ? (
          <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            Could not reach the API: <code className="text-xs">{apiErrorSummary(err)}</code>.
          </p>
        ) : null}

        {health ? (
          <section className="rounded-lg border border-border bg-card/50 px-4 py-3">
            <div className="text-sm font-medium text-foreground">Indexer freshness</div>
            <dl className="mt-2 grid gap-1">
              <Row k="lastIndexedBlock" v={String(health.lastIndexedBlock)} />
              {health.lastSyncAt ? (
                <Row k="lastSyncAt" v={String(health.lastSyncAt)} />
              ) : null}
            </dl>
          </section>
        ) : null}

        <section>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Published markets
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {activeMarkets.length} active epoch{activeMarkets.length === 1 ? "" : "s"} ·{" "}
                {markets.length} indexed template{markets.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="inline-flex w-fit rounded-md border border-border bg-card p-1">
              {([
                ["active", "Active epoch"],
                ["all", "All indexed"],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFilter(id)}
                  className={`rounded px-3 py-1.5 text-xs font-medium transition ${
                    filter === id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
            {visibleMarkets.length === 0 && !marketsQ.isLoading ? (
              <li className="px-4 py-6 text-sm text-muted-foreground">
                {filter === "active"
                  ? "No published markets with an active epoch yet. Open an epoch, then wait for the indexer to sync."
                  : "No templates indexed yet. Run the indexer against Base Sepolia RPC."}
              </li>
            ) : null}
            {visibleMarkets.map((m) => (
              <li key={m.templateId}>
                <Link
                  to={`/app/chain-markets/${encodeURIComponent(m.templateId)}`}
                  className="block px-4 py-3 transition hover:bg-muted/40"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="font-medium">{m.slug}</div>
                    <StatusPill market={m} />
                  </div>
                  <div className="mt-0.5 font-mono text-xs text-muted-foreground">
                    {m.templateId}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>{m.outcomeCount} outcomes</span>
                    <span>type {m.marketType}</span>
                    <span>block {m.lastIndexedBlock}</span>
                    {m.lastResolvedEpochId != null ? (
                      <span>last resolved #{m.lastResolvedEpochId}</span>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <Footer />
    </div>
  );
}
