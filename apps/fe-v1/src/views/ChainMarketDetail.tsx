import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";

import { ManualMarketPage } from "@/features/manual-market/ManualMarketPage";
import { manualMarketFromChainDetail } from "@/features/manual-market/types";
import {
  fetchMarketChart,
  fetchEpochsForMarket,
  fetchMarket,
  fetchMarketProbabilityHistory,
  type EpochRow,
  type MarketDetail,
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

function IndexerMetaPanel({ data }: { data: MarketDetail }) {
  return (
    <div className="rounded-xl border border-border bg-card/50 px-4 py-3">
      <h2 className="mb-2 text-sm font-medium text-muted-foreground">Indexer</h2>
      <dl className="grid gap-2">
        <Row k="templateId" v={data.templateId} />
        <Row k="marketType" v={String(data.marketType)} />
        <Row k="outcomeCount" v={String(data.outcomeCount)} />
        <Row k="initialized" v={String(data.initialized)} />
        <Row k="lastIndexedBlock" v={String(data.lastIndexedBlock)} />
        {data.lastIndexedAt ? <Row k="lastIndexedAt" v={data.lastIndexedAt} /> : null}
        {data.lastResolvedEpochId != null ? (
          <Row k="lastResolvedEpochId" v={String(data.lastResolvedEpochId)} />
        ) : null}
      </dl>
    </div>
  );
}

function normId(raw: string) {
  const d = decodeURIComponent(raw).trim();
  const h = d.startsWith("0x") ? d : `0x${d}`;
  return h.toLowerCase();
}

export default function ChainMarketDetail() {
  const navigate = useNavigate();
  const { templateId = "" } = useParams<{ templateId: string }>();
  const id = decodeURIComponent(templateId);
  const queryTemplateKey = id ? normId(id) : "";

  const marketQ = useQuery({
    queryKey: ["retropick-api", "market", queryTemplateKey],
    queryFn: () => fetchMarket(id),
    enabled: !!id,
    staleTime: 5_000,
  });
  useIndexerWebSocket(!!queryTemplateKey, queryTemplateKey, marketQ.data?.primaryFeedId);

  const epochsQ = useQuery({
    queryKey: ["retropick-api", "epochs", queryTemplateKey],
    queryFn: () => fetchEpochsForMarket(id, 50),
    enabled: !!id && !!marketQ.data,
    staleTime: 5_000,
  });

  const probabilityQ = useQuery({
    queryKey: ["retropick-api", "probability-history", queryTemplateKey, marketQ.data?.activeEpochId ?? null],
    queryFn: () => fetchMarketProbabilityHistory(id, marketQ.data?.activeEpochId),
    enabled: !!id && marketQ.data?.activeEpochId != null,
    staleTime: 5_000,
    refetchInterval: 20_000,
  });
  const chartQ = useQuery({
    queryKey: ["retropick-api", "market-chart", queryTemplateKey],
    queryFn: () => fetchMarketChart(id, { feedId: marketQ.data?.primaryFeedId, interval: 300, limit: 240 }),
    enabled: !!id,
    staleTime: 10_000,
    refetchInterval: 45_000,
  });

  const data = marketQ.data;
  const epochs: EpochRow[] = epochsQ.data ?? [];

  if (marketQ.isError) {
    return (
      <div className="min-h-screen bg-background px-4 py-10 text-foreground">
        <Link
          to="/app/markets/all"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Markets
        </Link>
        <p className="mt-6 text-sm text-destructive">Market not found or API unreachable.</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background px-4 py-10 text-muted-foreground">
        Loading…
      </div>
    );
  }

  const chartAsHistory = (chartQ.data?.candles ?? []).map((candle, idx) => ({
    blockNumber: idx + 1,
    txHash: `chart-${candle.bucketStart}`,
    logIndex: idx,
    eventName: "candle_updated",
    indexedAt: candle.updatedAt,
    totalPool: candle.closeE8,
    outcomes: (data.outcomes ?? []).map((outcome) => ({
      outcomeIndex: outcome.outcomeIndex,
      poolSize: outcome.poolSize,
      impliedProbabilityE6: outcome.impliedProbabilityE6,
    })),
  }));
  const model = manualMarketFromChainDetail(
    data,
    probabilityQ.data?.points?.length ? probabilityQ.data.points : chartAsHistory,
  );

  const resolutionExtras = (
    <div className="flex flex-col gap-6">
      <IndexerMetaPanel data={data} />
      {epochsQ.isError ? (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-200">
          Could not load recent epochs.
        </p>
      ) : null}
    </div>
  );

  return (
    <ManualMarketPage
      model={{ ...model, recentEpochs: epochs, resolutionExtras }}
      indexedHeaderContext={{ slug: data.slug, marketType: data.marketType }}
      backLabel="Markets"
      onBack={() => navigate("/app/markets/all")}
    />
  );
}
