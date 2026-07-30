import { useEffect, useState } from "react";
import type { AssetClass } from "@/lib/market-data/types";
import { loadReferenceChartData } from "@/lib/market-data/reference-series";
import { TradingChart } from "./TradingChart";
import { LineChartPanel } from "./LineChartPanel";

interface ReferenceAssetChartProps {
  assetClass: AssetClass;
}

export function ReferenceAssetChart({ assetClass }: ReferenceAssetChartProps) {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<Awaited<ReturnType<typeof loadReferenceChartData>> | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadReferenceChartData(assetClass)
      .then((r) => {
        if (!cancelled) setResult(r);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [assetClass]);

  if (loading || !result) {
    return (
      <section
        className="mb-8 rounded-lg border border-border bg-card/40 p-6"
        aria-busy="true"
        aria-label="Loading reference chart"
      >
        <div className="h-4 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-4 h-[280px] animate-pulse rounded-[28px] bg-muted/60" />
      </section>
    );
  }

  if (result.kind === "unavailable") {
    return (
      <section className="mb-8 rounded-lg border border-border bg-card/40 p-6">
        <h2 className="text-sm font-semibold text-foreground">{result.meta.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{result.message}</p>
        {result.reason === "missing_fred_key" ? (
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            Set <code className="rounded bg-muted px-1 py-0.5">VITE_FRED_API_KEY</code> in{" "}
            <code className="rounded bg-muted px-1 py-0.5">.env</code> (free key from FRED).
          </p>
        ) : null}
        <a
          href={result.meta.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-xs font-medium text-accent-cyan hover:underline"
        >
          {result.meta.sourceName} — documentation
        </a>
      </section>
    );
  }

  if (result.kind === "candles") {
    return (
      <section className="mb-8">
        <TradingChart
          candles={result.candles}
          height={360}
          pair={result.pairLabel}
          assetName={result.assetName}
          interval={result.interval}
        />
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Data:{" "}
          <a href={result.meta.sourceUrl} className="text-accent-cyan hover:underline" target="_blank" rel="noreferrer">
            {result.meta.sourceName}
          </a>
          {" · "}
          {result.meta.subtitle}
        </p>
      </section>
    );
  }

  return (
    <section className="mb-8">
      <LineChartPanel
        points={result.points}
        height={360}
        title={result.meta.title}
        subtitle={result.meta.subtitle}
        sourceLine={`${result.meta.sourceName} · ${result.meta.valueUnit ?? "series"}`}
        formatValue={result.formatValue}
      />
      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        Data:{" "}
        <a href={result.meta.sourceUrl} className="text-accent-cyan hover:underline" target="_blank" rel="noreferrer">
          {result.meta.sourceName}
        </a>
      </p>
    </section>
  );
}
