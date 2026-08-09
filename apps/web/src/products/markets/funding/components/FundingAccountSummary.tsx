"use client";

import { WalletAddressDisclosure } from "../../wallet/components/WalletAddressDisclosure";
import { ConnectWalletButton } from "../../wallet/components/ConnectWalletButton";
import { ChainGuardBanner } from "../../wallet/components/ChainGuardBanner";
import { useMarketsWalletConnect } from "../../wallet/hooks/useMarketsWalletConnect";
import { useMarketsWalletSession } from "../../wallet/hooks/useMarketsWalletSession";

import {
  SESSION_REQUIRED_DESCRIPTION,
  SESSION_REQUIRED_TITLE,
} from "../lib/fundingCopy";

interface FundingAccountSummaryProps {
  accountWallet?: string;
}

export function FundingAccountSummary({ accountWallet }: FundingAccountSummaryProps) {
  const { isConnected } = useMarketsWalletConnect();
  const { isSessionAuthenticated } = useMarketsWalletSession();

  if (!isConnected) {
    return (
      <section className="space-y-3 rounded-lg border border-border p-4">
        <h2 className="text-sm font-medium">Wallet</h2>
        <p className="text-sm text-muted-foreground">{SESSION_REQUIRED_DESCRIPTION}</p>
        <ChainGuardBanner />
        <ConnectWalletButton className="rounded-lg px-4 py-2" />
      </section>
    );
  }

  if (!isSessionAuthenticated) {
    return (
      <section className="space-y-3 rounded-lg border border-border p-4">
        <h2 className="text-sm font-medium">{SESSION_REQUIRED_TITLE}</h2>
        <p className="text-sm text-muted-foreground">{SESSION_REQUIRED_DESCRIPTION}</p>
        <ChainGuardBanner />
        <WalletAddressDisclosure accountWallet={accountWallet} />
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-lg border border-border p-4">
      <h2 className="text-sm font-medium">Account addresses</h2>
      <p className="text-xs text-muted-foreground">
        Signer and trading address are separate per ADR-003. Collateral is held at the trading address.
      </p>
      <ChainGuardBanner />
      <WalletAddressDisclosure accountWallet={accountWallet} />
    </section>
  );
}
