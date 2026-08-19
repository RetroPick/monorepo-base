"use client";

import { useMemo } from "react";
import { Link } from "react-router-dom";

import { walletConnectPath } from "../../routes/paths";
import { ConnectWalletButton } from "../../wallet/components/ConnectWalletButton";
import { useMarketsTradingWallets } from "../../wallet/hooks/useMarketsTradingWallets";
import { useMarketsWalletSession } from "../../wallet/hooks/useMarketsWalletSession";
import { useDepositWalletSetup } from "../hooks/useDepositWalletSetup";
import { useMarketsCollateralBalance } from "../hooks/useMarketsCollateralBalance";
import { DepositWalletSetupPanel } from "./DepositWalletSetupPanel";
import { FundingAccountSummary } from "./FundingAccountSummary";
import { FundingBalanceCard } from "./FundingBalanceCard";
import { SandboxFundingBanner } from "./SandboxFundingBanner";

/**
 * Shared deposit/funding panel — rendered inside the standalone Funding page
 * and embedded in the Portfolio page so balances and deposit setup live in
 * one place.
 */
export function FundingSection() {
  const { isSessionAuthenticated } = useMarketsWalletSession();
  const { accountWallet: fetchedAccountWallet } = useMarketsTradingWallets();
  const setup = useDepositWalletSetup();

  const accountWallet = useMemo(
    () => fetchedAccountWallet ?? setup.linkedAccountWallet,
    [fetchedAccountWallet, setup.linkedAccountWallet],
  );

  const hasLinkedWallet = Boolean(accountWallet);
  const balance = useMarketsCollateralBalance(
    isSessionAuthenticated && hasLinkedWallet ? accountWallet : undefined,
  );

  return (
    <div className="space-y-4">
      {!isSessionAuthenticated ? (
        <div className="rounded-xl border border-dashed border-border bg-elevated/40 px-6 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Connect and sign in to manage deposit wallet and balances.
          </p>
          <ConnectWalletButton className="mt-4 rounded-lg px-6 py-2.5 text-sm font-bold" label="Sign In" />
          <p className="mt-3 text-xs text-muted-foreground">
            <Link to={walletConnectPath()} className="text-primary hover:underline">
              Wallet settings
            </Link>
          </p>
        </div>
      ) : null}

      <SandboxFundingBanner />
      <FundingAccountSummary accountWallet={accountWallet} />

      {isSessionAuthenticated ? (
        <>
          <DepositWalletSetupPanel
            hasLinkedWallet={hasLinkedWallet}
            state={setup.state}
            errorMessage={setup.errorMessage}
            preview={setup.preview}
            createEnabled={setup.createEnabled}
            canAttemptSetup={setup.canAttemptSetup}
            wrongChain={setup.wrongChain}
            onStartPreview={() => void setup.startPreview()}
            onConfirmSign={() => void setup.confirmAndSign()}
            onCancelPreview={setup.resetPreview}
          />
          <FundingBalanceCard
            state={balance.state}
            data={balance.data}
            errorMessage={balance.errorMessage}
            onRetry={balance.refetch}
          />
        </>
      ) : null}
    </div>
  );
}

export default FundingSection;
