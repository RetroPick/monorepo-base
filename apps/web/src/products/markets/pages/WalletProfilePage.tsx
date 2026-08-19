import { Link, useParams } from "react-router-dom";

import { MarketsAppShell } from "../components/shell/MarketsAppShell";
import { DataStateEmpty } from "../components/DataState";
import { INTELLIGENCE_FIXTURES_ENABLED, INTELLIGENCE_SIMULATION_BANNER } from "../intelligence/config/features";
import { intelligencePath } from "../routes/paths";
import { ConnectWalletButton } from "../wallet/components/ConnectWalletButton";
import { useMarketsWalletSession } from "../wallet/hooks/useMarketsWalletSession";

export function WalletProfilePage() {
  const { address = "" } = useParams();
  const decoded = decodeURIComponent(address);
  const { isSessionAuthenticated } = useMarketsWalletSession();

  if (!INTELLIGENCE_FIXTURES_ENABLED) {
    return (
      <MarketsAppShell title="Wallet" hideBottomNav>
        <DataStateEmpty title="Wallet profiles unavailable" description="Enable after intelligence I2 backend ships." />
      </MarketsAppShell>
    );
  }

  return (
    <MarketsAppShell title="Wallet" hideBottomNav>
      <div className="mb-4 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary">
        {INTELLIGENCE_SIMULATION_BANNER}
      </div>
      <Link to={intelligencePath()} className="text-xs font-bold text-primary hover:underline">
        ← Back to Intelligence
      </Link>
      <header className="card-surface mt-4 rounded-xl border border-border p-6">
        <div className="flex items-center gap-3">
          <div
            className="grid size-11 place-items-center rounded-full bg-muted font-mono text-sm font-bold text-muted-foreground"
            aria-hidden
          >
            {decoded.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase() || "0x"}
          </div>
          <p className="min-w-0 truncate font-mono text-sm font-bold">{decoded}</p>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="stat-tile">
            <p className="stat-tile-label">ROI</p>
            <p className="stat-tile-value text-yes">+124%</p>
          </div>
          <div className="stat-tile">
            <p className="stat-tile-label">Win rate</p>
            <p className="stat-tile-value">68%</p>
          </div>
          <div className="stat-tile">
            <p className="stat-tile-label">Volume</p>
            <p className="stat-tile-value">$1.2M</p>
          </div>
        </div>
      </header>

      <div className="mt-6 flex flex-wrap gap-2">
        {isSessionAuthenticated ? (
          <>
            <button
              type="button"
              className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
            >
              Follow
            </button>
            <button type="button" className="rounded-lg border border-border bg-elevated px-4 py-2 text-xs font-bold">
              Quick backtest
            </button>
          </>
        ) : (
          <ConnectWalletButton className="rounded-lg px-4 py-2 text-xs font-bold" label="Sign in to follow" />
        )}
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        Paper copy requires auth (I6) and remains simulated — not Polymarket fills.
      </p>
    </MarketsAppShell>
  );
}

export default WalletProfilePage;
