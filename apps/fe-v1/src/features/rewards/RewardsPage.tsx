import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";

import { apiBaseUrl } from "@/features/gooddollar/config";

export function RewardsPage() {
  const { address } = useAccount();
  const { data, isLoading } = useQuery({
    queryKey: ["rewards", "claimable", address],
    enabled: Boolean(address),
    queryFn: async () => {
      const res = await fetch(
        `${apiBaseUrl()}/api/v1/rewards/claimable?wallet=${encodeURIComponent(address!)}`,
      );
      if (res.status === 404) return { items: [] };
      if (!res.ok) throw new Error("rewards fetch failed");
      return (await res.json()) as { items: Array<{ id: number; amount: string; reason: string }> };
    },
  });

  return (
    <div className="mx-auto max-w-lg p-4 space-y-4">
      <h1 className="text-2xl font-bold">Rewards</h1>
      <p className="text-muted-foreground">Claim rewards from invites and learn-to-predict quests.</p>
      {isLoading ? <p>Loading…</p> : null}
      {(data?.items ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">No claimable rewards yet. Make a prediction or complete a quest.</p>
      ) : (
        <ul className="space-y-2">
          {data!.items.map((item) => (
            <li key={item.id} className="rounded-lg border p-3 flex justify-between items-center">
              <span>{item.reason}</span>
              <button type="button" className="rounded-md bg-primary text-primary-foreground px-3 py-1 text-sm">
                Claim
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
