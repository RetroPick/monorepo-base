import { Link } from "react-router-dom";

import { DataStateBanner, DataStateEmpty, StaleBanner } from "../components/DataState";
import { FreshnessBadge } from "../components/FreshnessBadge";
import { MarketsAppShell } from "../components/shell/MarketsAppShell";
import { useMarketsCapabilities, useMarketsSignals, useMarketsWhales } from "../hooks/useMarketsQueries";
import { intelligenceFollowingPath, intelligencePaperPath, intelligenceSmartMoneyPath, marketPath } from "../routes/paths";

function evidenceIsComplete(evidence: { contentHash: string }[]) {
  return evidence.length > 0 && evidence.every((item) => item.contentHash.length > 0);
}

export function IntelligenceHubPage() {
  const capabilities = useMarketsCapabilities();
  const whaleFeedEnabled = capabilities.data?.intelligence === true && capabilities.data.features?.intelligence_whale_feed === true;
  const whales = useMarketsWhales(whaleFeedEnabled);
  const signals = useMarketsSignals();

  return (
    <MarketsAppShell title="Intelligence">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Intelligence</h1>
          <p className="mt-1 text-sm text-muted-foreground">Evidence-linked public-market observations from the Markets BFF.</p>
        </div>
        <div className="flex gap-2">
          <Link to={intelligenceSmartMoneyPath()} className="rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-xs font-bold hover:bg-secondary/60">Smart Money</Link>
          <Link to={intelligenceFollowingPath()} className="rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-xs font-bold hover:bg-secondary/60">Following</Link>
          <Link to={intelligencePaperPath()} className="rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-xs font-bold hover:bg-secondary/60">Paper simulation</Link>
        </div>
      </div>

      <section aria-labelledby="whale-feed-heading">
        <div className="flex items-center justify-between gap-3">
          <h2 id="whale-feed-heading" className="font-display text-lg font-bold">Whale feed</h2>
          {whales.data ? <FreshnessBadge freshness={whales.data.freshness} /> : null}
        </div>
        {capabilities.error ? <DataStateBanner error={capabilities.error} onRetry={() => capabilities.refetch()} /> : null}
        {!capabilities.isLoading && !capabilities.error && !whaleFeedEnabled ? (
          <DataStateEmpty title="Whale feed unavailable" description="The Markets BFF has not enabled the descriptive whale-feed capability." />
        ) : null}
        {whales.error ? <DataStateBanner error={whales.error} title="Whale feed unavailable" onRetry={() => whales.refetch()} className="mt-3" /> : null}
        {whales.data?.freshness.state === "stale" ? <StaleBanner message="Intelligence delayed. Review the timestamps and evidence before relying on these observations." /> : null}
        {whaleFeedEnabled && !whales.isLoading && !whales.error && whales.data?.items.length === 0 ? <DataStateEmpty title="No whale observations available" description="No BFF-backed public trade observations matched the current feed." /> : null}
        {whales.data?.items.length ? (
          <ul className="mt-3 space-y-3">
            {whales.data.items.map((item) => (
              <li key={item.fingerprint} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link to={marketPath(item.marketId)} className="text-sm font-semibold text-primary hover:underline">{item.marketTitle ?? item.marketId}</Link>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">{item.wallet}</p>
                    <p className="mt-2 text-xs text-muted-foreground">Observed {item.tradeTs} · source {item.provenance.source} · lag {item.lagSeconds}s</p>
                  </div>
                  <div className="shrink-0 text-right text-xs">
                    <p className="font-bold">{item.side} {item.outcome}</p>
                    <p className="mt-1 tabular-nums">Notional {item.notionalUsd}</p>
                    <p className="mt-1">WhaleScore {item.whaleScore}</p>
                  </div>
                </div>
                <div className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
                  <p>Reason codes: {item.reasonCodes.join(", ")}</p>
                  <p className="mt-1">Evidence: {item.evidence.hash} · {item.evidence.lifecycle} · {item.evidence.paramsRef}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="mt-8" aria-labelledby="signals-heading">
        <h2 id="signals-heading" className="font-display text-lg font-bold">Signal evidence</h2>
        <p className="mt-1 text-sm text-muted-foreground">Signals are informational; they do not place, copy, or submit orders.</p>
        {signals.error ? <DataStateBanner error={signals.error} title="Signals unavailable" onRetry={() => signals.refetch()} className="mt-3" /> : null}
        {!signals.isLoading && !signals.error && signals.data?.signals.length === 0 ? <DataStateEmpty title="No signals available" description="The BFF has not published any current signal envelopes." /> : null}
        {signals.data?.signals.length ? (
          <ul className="mt-3 space-y-3">
            {signals.data.signals.map((signal) => (
              <li key={signal.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link to={marketPath(signal.marketId)} className="font-semibold text-primary hover:underline">{signal.type.replace(/_/g, " ")}</Link>
                  <span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium">{signal.state === "retracted" ? "Retracted" : signal.state}</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Rule {signal.ruleVersion} · created {signal.createdAt}{signal.retractedAt ? ` · retracted ${signal.retractedAt}` : ""}</p>
                <p className="mt-2 text-xs">Reason codes: {signal.reasonCodes.join(", ")}</p>
                {evidenceIsComplete(signal.evidence) ? <p className="mt-1 text-xs text-muted-foreground">Evidence references: {signal.evidence.map((item) => item.contentHash).join(", ")}</p> : <p className="mt-1 text-xs text-amber-300">Evidence incomplete — no confidence or recommendation is shown.</p>}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </MarketsAppShell>
  );
}

export default IntelligenceHubPage;