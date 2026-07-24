import { useAccount } from "wagmi";

import { useGoodDollarStatus } from "./useGoodDollarStatus";

export function GUSDollarBalanceCard() {
  const { address } = useAccount();
  const { data, isLoading, isError } = useGoodDollarStatus(address);

  if (!address) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-lg font-semibold">My G$</h2>
        <p className="text-sm text-muted-foreground">Connect your wallet to see your G$ balance.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">My G$</h2>
        {data?.goodIdVerified ? (
          <span className="text-xs rounded-full bg-emerald-500/15 text-emerald-600 px-2 py-1">Verified human (stub)</span>
        ) : null}
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
      {isError ? <p className="text-sm text-destructive">Could not load G$ status.</p> : null}
      {data ? (
        <>
          <p className="text-2xl font-bold">{formatBalance(data.gDollarBalance)} G$</p>
          {!data.canClaimOrReceiveG ? (
            <p className="text-sm text-muted-foreground">Balance from API — claim/receive G$ on-chain not live in RC.</p>
          ) : (
            <p className="text-sm text-muted-foreground">Balance from API. On-chain daily markets pending Alfajores deploy.</p>
          )}
        </>
      ) : null}
    </div>
  );
}

function formatBalance(raw: string): string {
  try {
    const v = BigInt(raw);
    const whole = v / 10n ** 18n;
    const frac = (v % 10n ** 18n) / 10n ** 16n;
    return `${whole}.${frac.toString().padStart(2, "0")}`;
  } catch {
    return "0.00";
  }
}
