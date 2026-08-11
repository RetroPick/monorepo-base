import { Link } from "react-router-dom";

import { MarketsAppShell } from "../components/shell/MarketsAppShell";
import { DataStateEmpty } from "../components/DataState";
import { INTELLIGENCE_FIXTURES_ENABLED, INTELLIGENCE_SIMULATION_BANNER } from "../intelligence/config/features";
import { FIXTURE_PAPER_BALANCE } from "../intelligence/fixtures/devFixtures";
import { intelligencePath } from "../routes/paths";
import { useMarketsWalletSession } from "../wallet/hooks/useMarketsWalletSession";

export function PaperPortfolioPage() {
  const { isSessionAuthenticated } = useMarketsWalletSession();

  if (!INTELLIGENCE_FIXTURES_ENABLED) {
    return (
      <MarketsAppShell title="Paper">
        <DataStateEmpty title="Paper copy unavailable" description="Ships with intelligence I6." />
      </MarketsAppShell>
    );
  }

  return (
    <MarketsAppShell title="Paper">
      <div className="mb-4 rounded-lg border border-no/30 bg-no-soft px-4 py-2 text-xs font-semibold text-no">
        {INTELLIGENCE_SIMULATION_BANNER} Paper portfolio only — not Polymarket fills.
      </div>
      <Link to={intelligencePath()} className="text-xs font-bold text-primary hover:underline">
        ← Intelligence
      </Link>
      <h1 className="mt-4 font-display text-2xl font-bold">Paper portfolio</h1>
      {!isSessionAuthenticated ? (
        <p className="mt-2 text-sm text-muted-foreground">Connect wallet to save paper follows (I4+).</p>
      ) : null}
      <div className="mt-6 rounded-xl border border-border bg-card p-6">
        <p className="text-[10px] uppercase font-bold text-muted-foreground">Virtual balance</p>
        <p className="mt-2 font-display text-3xl font-bold">{FIXTURE_PAPER_BALANCE}</p>
      </div>
    </MarketsAppShell>
  );
}

export default PaperPortfolioPage;
