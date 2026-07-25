import { Link } from "react-router-dom";

import { goodDollarEnabled } from "./config";
import { GUSDollarBalanceCard } from "./GUSDollarBalanceCard";

export default function GoodDollarHubPage() {
  if (!goodDollarEnabled) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        GoodDollar features are disabled. Set VITE_GOODDOLLAR_ENABLED=1 to enable.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg p-4 space-y-4">
      <h1 className="text-2xl font-bold">RetroPick × GoodDollar</h1>
      <p className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
        Demo scope: G$ balance (API), referrals, and impact dashboard. Daily market and on-chain rewards are preview
        or API-only until Alfajores treasury deploy is complete.
      </p>
      <GUSDollarBalanceCard />
      <nav className="grid grid-cols-2 gap-2 text-sm">
        <Link className="rounded-lg border p-3" to="/app/gooddollar/daily">
          Daily Market
        </Link>
        <Link className="rounded-lg border p-3" to="/app/gooddollar/rewards">
          Rewards
        </Link>
        <Link className="rounded-lg border p-3" to="/app/gooddollar/invite">
          Invite
        </Link>
        <Link className="rounded-lg border p-3" to="/app/gooddollar/learn">
          Learn
        </Link>
        <Link className="rounded-lg border p-3 col-span-2" to="/app/gooddollar/impact">
          Impact Dashboard
        </Link>
      </nav>
    </div>
  );
}
