"use client";

import { Link } from "react-router-dom";
import { Shield, Wallet } from "lucide-react";

import { MarketsAppShell } from "../../components/shell/MarketsAppShell";
import { ConnectWalletButton } from "../components/ConnectWalletButton";
import { WalletConnectHarness } from "../components/WalletConnectHarness";
import { useMarketsWalletConnect } from "../hooks/useMarketsWalletConnect";
import { fundingPath } from "../../routes/paths";

export function WalletConnectPage() {
  const { isConnected } = useMarketsWalletConnect();

  return (
    <MarketsAppShell title="Wallet" hideBottomNav>
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-3 text-primary">
            <Wallet className="h-6 w-6" aria-hidden />
            <h1 className="font-display text-2xl font-bold">Connect wallet</h1>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in with your external wallet on Polygon. RetroPick never stores private keys.
          </p>
          {!isConnected ? (
            <div className="mt-4">
              <ConnectWalletButton className="w-full rounded-lg py-3 text-sm font-bold" label="Sign In with Wallet" />
            </div>
          ) : null}
        </header>

        <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-xs text-primary">
          <Shield className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            Signer and trading addresses are shown separately. Session eligibility is enforced server-side.
          </p>
        </div>

        <WalletConnectHarness />

        <p className="text-center text-sm text-muted-foreground">
          Need collateral?{" "}
          <Link to={fundingPath()} className="font-bold text-primary hover:underline">
            Add funds
          </Link>
        </p>
      </div>
    </MarketsAppShell>
  );
}

export default WalletConnectPage;
