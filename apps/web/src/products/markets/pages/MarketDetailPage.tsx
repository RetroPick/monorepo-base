import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { HistoryInterval } from "@retropick/polymarket";

import { DataStateBanner, ProvenanceFooter } from "../components/DataState";
import { FreshnessBadge } from "../components/FreshnessBadge";
import { MarketsShell } from "../components/MarketsShell";
import { OrderBookPanel } from "../components/OrderBookPanel";
import { PriceChart } from "../components/PriceChart";
import { formatProbability } from "../lib/decimal";
import {
  useMarketsHealth,
  useMarketsMarket,
  useMarketsOrderBook,
  useMarketsPriceHistory,
} from "../hooks/useMarketsQueries";

const INTERVALS: HistoryInterval[] = ["1h", "6h", "1d", "1w", "max"];

export default function MarketDetailPage() {
  const { marketId = "" } = useParams();
  const decodedId = decodeURIComponent(marketId);
  const market = useMarketsMarket(decodedId);

  const outcomes = market.data?.outcomes ?? [];
  const [selectedTokenId, setSelectedTokenId] = useState<string>("");
  const tokenId = selectedTokenId || outcomes[0]?.upstreamId || "";

  const pollingEnabled =
    market.data?.status === "open" && market.data?.capabilities.orderBook === true;

  const orderBook = useMarketsOrderBook(decodedId, tokenId, pollingEnabled);
  const [interval, setInterval] = useState<HistoryInterval>("1d");
  const history = useMarketsPriceHistory(decodedId, tokenId, interval);
  const health = useMarketsHealth(decodedId, tokenId);

  const selectedOutcome = useMemo(
    () => outcomes.find((o) => o.upstreamId === tokenId),
    [outcomes, tokenId],
  );

  return (
    <MarketsShell>
      <div className="space-y-4">
        <Link
          to={market.data?.eventId ? `/markets/events/${encodeURIComponent(market.data.eventId)}` : "/markets"}
          className="text-sm text-primary hover:underline"
        >
          ← Back
        </Link>

        <DataStateBanner error={market.error} onRetry={() => market.refetch()} />

        {market.isLoading ? <p className="text-sm text-muted-foreground">Loading market…</p> : null}

        {market.data ? (
          <>
            <header className="space-y-2">
              <FreshnessBadge freshness={market.data.freshness} marketStatus={market.data.status} />
              <h2 className="text-xl font-semibold leading-snug">{market.data.question}</h2>
              {market.data.description ? (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{market.data.description}</p>
              ) : null}
            </header>

            {outcomes.length > 0 ? (
              <div className="flex flex-wrap gap-2" role="tablist" aria-label="Outcomes">
                {outcomes.map((outcome) => (
                  <button
                    key={outcome.id}
                    type="button"
                    role="tab"
                    aria-selected={tokenId === outcome.upstreamId}
                    className={`rounded-full border px-3 py-1.5 text-sm ${
                      tokenId === outcome.upstreamId
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground"
                    }`}
                    onClick={() => setSelectedTokenId(outcome.upstreamId)}
                  >
                    {outcome.name}
                    {outcome.price ? ` · ${formatProbability(outcome.price)}` : ""}
                  </button>
                ))}
              </div>
            ) : null}

            <section className="rounded-xl border border-border p-4">
              <h3 className="mb-3 text-sm font-medium">Price history</h3>
              <div className="mb-3 flex flex-wrap gap-1">
                {INTERVALS.map((iv) => (
                  <button
                    key={iv}
                    type="button"
                    className={`rounded px-2 py-1 text-xs ${
                      interval === iv ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                    onClick={() => setInterval(iv)}
                  >
                    {iv}
                  </button>
                ))}
              </div>
              <PriceChart history={history.data} isLoading={history.isLoading} />
              <DataStateBanner error={history.error} onRetry={() => history.refetch()} />
            </section>

            <section className="rounded-xl border border-border p-4">
              <h3 className="mb-3 text-sm font-medium">
                Order book {selectedOutcome ? `· ${selectedOutcome.name}` : ""}
              </h3>
              <p className="mb-2 text-xs text-muted-foreground">
                Snapshot polling — not realtime. Updated periodically while tab is visible.
              </p>
              <OrderBookPanel snapshot={orderBook.data} isLoading={orderBook.isLoading} />
              <DataStateBanner error={orderBook.error} onRetry={() => orderBook.refetch()} />
            </section>

            {health.data ? (
              <section className="rounded-xl border border-border p-4 text-sm">
                <h3 className="mb-2 font-medium">Market health</h3>
                <dl className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Bid depth</dt>
                    <dd className="font-mono">{health.data.bidDepth}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Ask depth</dt>
                    <dd className="font-mono">{health.data.askDepth}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Snapshot age</dt>
                    <dd>{health.data.snapshotAgeMs}ms</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Crossed</dt>
                    <dd>{health.data.crossed ? "yes" : "no"}</dd>
                  </div>
                </dl>
              </section>
            ) : null}

            <section className="rounded-xl border border-dashed border-border p-4">
              <h3 className="text-sm font-medium">Trade</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Order placement is unavailable in Phase 1.2. Builder V2 trading is documented for a future phase.
              </p>
              <button
                type="button"
                disabled
                className="mt-3 w-full cursor-not-allowed rounded-lg bg-muted px-4 py-2 text-sm font-medium text-muted-foreground"
              >
                Trading unavailable
              </button>
            </section>

            {market.data.resolution ? (
              <section className="rounded-xl border border-border p-4 text-sm">
                <h3 className="mb-2 font-medium">Resolution rules</h3>
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {market.data.resolution.description}
                </p>
                {market.data.resolution.sources.length > 0 ? (
                  <ul className="mt-2 list-disc pl-4 text-xs">
                    {market.data.resolution.sources.map((src) => (
                      <li key={src.name}>
                        {src.url ? (
                          <a
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            {src.name}
                          </a>
                        ) : (
                          src.name
                        )}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ) : null}

            <ProvenanceFooter
              source={market.data.provenance.source}
              observedAt={market.data.provenance.observedAt}
            />
          </>
        ) : null}
      </div>
    </MarketsShell>
  );
}
