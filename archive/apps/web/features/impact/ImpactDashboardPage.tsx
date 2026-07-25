import { useQuery } from "@tanstack/react-query";

import { apiBaseUrl } from "@/features/gooddollar/config";

type ImpactSummary = {
  gDollarVolume: string;
  predictions: number;
  uniqueUsers: number;
  verifiedUsers: number;
  rewardsClaimed: string;
  marketsResolved: number;
  returningUsers: number;
};

export default function ImpactDashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["impact", "gooddollar"],
    queryFn: async (): Promise<ImpactSummary> => {
      const res = await fetch(`${apiBaseUrl()}/api/v1/impact/gooddollar`);
      if (res.status === 404) {
        return {
          gDollarVolume: "0",
          predictions: 0,
          uniqueUsers: 0,
          verifiedUsers: 0,
          rewardsClaimed: "0",
          marketsResolved: 0,
          returningUsers: 0,
        };
      }
      if (!res.ok) throw new Error("impact fetch failed");
      return (await res.json()) as ImpactSummary;
    },
  });

  return (
    <div className="mx-auto max-w-2xl p-4 space-y-4">
      <h1 className="text-2xl font-bold">GoodDollar Impact</h1>
      <p className="text-muted-foreground">Public metrics for G$ utility, users, and rewards on RetroPick.</p>
      {isLoading ? <p>Loading…</p> : null}
      {isError ? <p className="text-destructive">Impact data unavailable.</p> : null}
      {data ? (
        <div className="grid grid-cols-2 gap-3">
          <Metric label="G$ volume" value={data.gDollarVolume} />
          <Metric label="Unique users" value={String(data.uniqueUsers)} />
          <Metric label="Verified humans" value={String(data.verifiedUsers)} />
          <Metric label="Markets resolved" value={String(data.marketsResolved)} />
          <Metric label="Rewards claimed" value={data.rewardsClaimed} />
          <Metric label="Returning users" value={String(data.returningUsers)} />
        </div>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
