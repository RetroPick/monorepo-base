"use client";

import { Button } from "@/shared/components/ui/button";

import { ConnectWalletButton } from "./ConnectWalletButton";
import { ChainGuardBanner } from "./ChainGuardBanner";
import { WalletAddressDisclosure } from "./WalletAddressDisclosure";
import { truncateAddress } from "../lib/truncateAddress";
import { useMarketsWalletConnect } from "../hooks/useMarketsWalletConnect";
import { useMarketsWalletGate } from "../hooks/useMarketsWalletGate";
import { useMarketsWalletSession } from "../hooks/useMarketsWalletSession";

export function WalletConnectHarness() {
  const { isConnected } = useMarketsWalletConnect();
  const {
    sessionState,
    sessionError,
    sessionWallet,
    expiresAt,
    isSessionAuthenticated,
    isRestoring,
    logout,
  } = useMarketsWalletSession();
  const gate = useMarketsWalletGate();

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Wallet connect</h2>
        <p className="text-sm text-muted-foreground">
          Connect an external wallet on Polygon. RetroPick never stores your private keys.
        </p>
        <ChainGuardBanner />
        {isConnected ? <WalletAddressDisclosure /> : <ConnectWalletButton className="rounded-lg px-4 py-2" />}
      </section>

      <section className="space-y-2 rounded-lg border border-border p-4">
        <h3 className="text-sm font-medium">Session</h3>
        <dl className="grid gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">State</dt>
            <dd className="font-mono">{sessionState}</dd>
          </div>
          {isRestoring ? (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Restore</dt>
              <dd>in progress</dd>
            </div>
          ) : null}
          {sessionWallet ? (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Session wallet</dt>
              <dd className="font-mono">{truncateAddress(sessionWallet)}</dd>
            </div>
          ) : null}
          {expiresAt ? (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Expires</dt>
              <dd className="font-mono text-xs">{expiresAt}</dd>
            </div>
          ) : null}
          {sessionError ? (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Detail</dt>
              <dd className="text-right text-destructive">{sessionError}</dd>
            </div>
          ) : null}
        </dl>
        {isSessionAuthenticated ? (
          <Button type="button" size="sm" variant="outline" onClick={() => void logout()}>
            Sign out
          </Button>
        ) : null}
      </section>

      <section className="space-y-2 rounded-lg border border-border p-4">
        <h3 className="text-sm font-medium">Platform gates</h3>
        <dl className="grid gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Catalog</dt>
            <dd>{gate.catalogEnabled ? "enabled" : "disabled"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Trading</dt>
            <dd>{gate.tradingEnabled ? "enabled" : "disabled"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Eligible</dt>
            <dd>
              {gate.eligibilityUnknown
                ? "unknown (fail closed)"
                : gate.eligible
                  ? "yes"
                  : "no"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Trading CTAs</dt>
            <dd>{gate.canShowTradingCTAs ? "allowed" : "blocked"}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
