"use client";

import { MarketsShellLayout } from "../../components/MarketsShellLayout";
import { WalletConnectHarness } from "../components/WalletConnectHarness";

export function WalletConnectPage() {
  return (
    <MarketsShellLayout>
      <div className="mx-auto max-w-2xl space-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Wallet</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Staging harness for Markets wallet connect (MKT-P2-001). Signer and trading addresses are shown separately.
          </p>
        </div>
        <WalletConnectHarness />
      </div>
    </MarketsShellLayout>
  );
}

export default WalletConnectPage;
