import { Link } from "react-router-dom";
import { UserPlus } from "lucide-react";

import { MarketsAppShell } from "../components/shell/MarketsAppShell";
import { DataStateEmpty } from "../components/DataState";
import { INTELLIGENCE_FIXTURES_ENABLED, INTELLIGENCE_SIMULATION_BANNER } from "../intelligence/config/features";
import { FIXTURE_FOLLOWING } from "../intelligence/fixtures/devFixtures";
import { intelligencePath, walletProfilePath } from "../routes/paths";
import { ConnectWalletButton } from "../wallet/components/ConnectWalletButton";
import { useMarketsWalletSession } from "../wallet/hooks/useMarketsWalletSession";

export function FollowingPage() {
  const { isSessionAuthenticated } = useMarketsWalletSession();

  if (!INTELLIGENCE_FIXTURES_ENABLED) {
    return (
      <MarketsAppShell title="Following">
        <DataStateEmpty title="Follow lists unavailable" description="Ships with intelligence I4 backend." />
      </MarketsAppShell>
    );
  }

  return (
    <MarketsAppShell title="Following">
      <div className="mb-4 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary">
        {INTELLIGENCE_SIMULATION_BANNER} Follow lists are private by default.
      </div>
      <Link to={intelligencePath()} className="text-xs font-bold text-primary hover:underline">
        ← Intelligence
      </Link>
      <h1 className="mt-4 font-display text-2xl font-bold">Following</h1>

      {!isSessionAuthenticated ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-elevated/40 px-6 py-8 text-center">
          <UserPlus className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
          <p className="mt-3 text-sm text-muted-foreground">Sign in to manage your follow list.</p>
          <ConnectWalletButton className="mt-4 rounded-lg px-6 py-2.5 text-sm font-bold" label="Sign In" />
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {FIXTURE_FOLLOWING.map((wallet) => (
            <li key={wallet} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
              <Link to={walletProfilePath(wallet)} className="font-mono text-xs font-bold text-primary hover:underline">
                {wallet}
              </Link>
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Following</span>
            </li>
          ))}
        </ul>
      )}
    </MarketsAppShell>
  );
}

export default FollowingPage;
