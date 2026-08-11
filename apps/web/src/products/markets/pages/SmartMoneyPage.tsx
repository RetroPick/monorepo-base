import { Link } from "react-router-dom";

import { MarketsAppShell } from "../components/shell/MarketsAppShell";
import { DataStateEmpty } from "../components/DataState";
import { INTELLIGENCE_FIXTURES_ENABLED, INTELLIGENCE_SIMULATION_BANNER } from "../intelligence/config/features";
import { FIXTURE_SMART_MONEY } from "../intelligence/fixtures/devFixtures";
import { intelligencePath, walletProfilePath } from "../routes/paths";

export function SmartMoneyPage() {
  if (!INTELLIGENCE_FIXTURES_ENABLED) {
    return (
      <MarketsAppShell title="Smart Money">
        <DataStateEmpty title="Smart Money unavailable" description="Ships with intelligence I3." />
      </MarketsAppShell>
    );
  }

  return (
    <MarketsAppShell title="Smart Money">
      <div className="mb-4 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary">
        {INTELLIGENCE_SIMULATION_BANNER}
      </div>
      <Link to={intelligencePath()} className="text-xs font-bold text-primary hover:underline">
        ← Whale feed
      </Link>
      <h1 className="mt-4 font-display text-2xl font-bold">Smart Money leaderboard</h1>
      <ul className="mt-6 space-y-2">
        {FIXTURE_SMART_MONEY.map((row) => (
          <li key={row.rank} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
            <span className="font-bold text-muted-foreground">#{row.rank}</span>
            <Link to={walletProfilePath(row.wallet)} className="flex-1 px-4 font-mono text-xs text-primary hover:underline">
              {row.wallet}
            </Link>
            <span className="font-bold text-yes">{row.roi}</span>
          </li>
        ))}
      </ul>
    </MarketsAppShell>
  );
}

export default SmartMoneyPage;
