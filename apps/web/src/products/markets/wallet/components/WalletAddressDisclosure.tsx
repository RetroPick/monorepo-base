"use client";

import { Button } from "@/shared/components/ui/button";

import { POLYGON_CHAIN_ID, getMarketsChainLabel } from "../config/chains";
import { truncateAddress } from "../lib/truncateAddress";
import { useMarketsWalletConnect } from "../hooks/useMarketsWalletConnect";
import { useMarketsWalletSession } from "../hooks/useMarketsWalletSession";
import { useMarketsTradingWallets } from "../hooks/useMarketsTradingWallets";

interface WalletAddressDisclosureProps {
  /** Polymarket proxy / Safe from GET /me/wallets — wired in MKT-P2-003 */
  accountWallet?: string;
  compact?: boolean;
}

export function WalletAddressDisclosure({ accountWallet: accountWalletProp, compact = false }: WalletAddressDisclosureProps) {
  const { address, chainId, isConnected, disconnect } = useMarketsWalletConnect();
  const { sessionState, sessionError, isSessionAuthenticated, isRestoring, authenticate, logout } =
    useMarketsWalletSession();
  const { accountWallet: fetchedAccountWallet } = useMarketsTradingWallets();
  const accountWallet = accountWalletProp ?? fetchedAccountWallet;

  if (!isConnected || !address) {
    return null;
  }

  const chainLabel = chainId != null ? getMarketsChainLabel(chainId) : "Unknown";
  const wrongChain = chainId != null && chainId !== POLYGON_CHAIN_ID;

  return (
    <div className={compact ? "flex items-center gap-2" : "space-y-3 rounded-lg border border-border p-4"}>
      <div className={compact ? "min-w-0 text-right text-xs" : "space-y-1 text-sm"}>
        <div>
          <span className="text-muted-foreground">Signer: </span>
          <span className="font-mono font-medium">{truncateAddress(address)}</span>
        </div>
        {!compact ? (
          <div>
            <span className="text-muted-foreground">Trading address: </span>
            {accountWallet ? (
              <span className="font-mono font-medium">{truncateAddress(accountWallet)}</span>
            ) : (
              <span className="text-muted-foreground">Linked after account setup (PHASE-2)</span>
            )}
          </div>
        ) : null}
        <div className={compact ? "text-muted-foreground" : "text-xs text-muted-foreground"}>
          {chainLabel} · {chainId ?? "—"}
          {wrongChain ? " · switch to Polygon" : null}
        </div>
        {!compact && sessionError && sessionState !== "authenticated" ? (
          <p className="text-xs text-destructive">{sessionError}</p>
        ) : null}
        {!compact && isRestoring ? (
          <p className="text-xs text-muted-foreground">Restoring Markets session…</p>
        ) : null}
        {!compact && isSessionAuthenticated ? (
          <p className="text-xs text-primary">Markets session active</p>
        ) : null}
      </div>
      {!compact ? (
        <div className="flex flex-wrap gap-2">
          {!isSessionAuthenticated ? (
            <Button type="button" size="sm" variant="secondary" disabled={wrongChain} onClick={() => void authenticate()}>
              Sign in with wallet
            </Button>
          ) : (
            <Button type="button" size="sm" variant="secondary" onClick={() => void logout()}>
              Sign out
            </Button>
          )}
          <Button type="button" size="sm" variant="outline" onClick={() => disconnect()}>
            Disconnect
          </Button>
        </div>
      ) : (
        <Button type="button" size="sm" variant="outline" onClick={() => disconnect()}>
          Disconnect
        </Button>
      )}
    </div>
  );
}
