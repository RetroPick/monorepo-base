import { Link } from "react-router-dom";

import { ConnectWalletButton } from "../wallet/components/ConnectWalletButton";
import { MarketsAppShell } from "../components/shell/MarketsAppShell";
import { TradingLifecyclePanel } from "../trading/components/TradingLifecyclePanel";
import { useMarketsWalletSession } from "../wallet/hooks/useMarketsWalletSession";

export function PortfolioPage() {
  const { isSessionAuthenticated } = useMarketsWalletSession();

  return (
    <MarketsAppShell title="Portfolio">
      <div className="mb-4">
        <h1 className="font-display text-2xl font-bold tracking-tight">Portfolio</h1>
        <p className="mt-1 text-sm text-muted-foreground">Private positions and activity from the RetroPick Markets BFF.</p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4">
        {!isSessionAuthenticated ? (
          <div className="flex shrink-0 flex-wrap items-center gap-3 rounded-xl border border-border bg-elevated/50 px-4 py-3">
            <p className="min-w-0 flex-1 text-sm text-muted-foreground">Sign in to view your private trading lifecycle.</p>
            <ConnectWalletButton className="h-10 shrink-0 rounded-lg px-5 text-sm font-bold" label="Sign In" />
          </div>
        ) : null}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <TradingLifecyclePanel />
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Browse{" "}
          <Link to="/markets" className="font-semibold text-primary hover:underline">
            Markets
          </Link>{" "}
          while your portfolio refreshes.
        </p>
      </div>
    </MarketsAppShell>
  );
}

export default PortfolioPage;
