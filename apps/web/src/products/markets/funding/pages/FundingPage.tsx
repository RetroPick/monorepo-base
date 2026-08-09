"use client";

import { useMemo } from "react";

import { MarketsShellLayout } from "../../components/MarketsShellLayout";
import { useMarketsTradingWallets } from "../../wallet/hooks/useMarketsTradingWallets";
import { useMarketsWalletSession } from "../../wallet/hooks/useMarketsWalletSession";

import { DepositWalletSetupPanel } from "../components/DepositWalletSetupPanel";
import { FundingAccountSummary } from "../components/FundingAccountSummary";
import { FundingBalanceCard } from "../components/FundingBalanceCard";
import { SandboxFundingBanner } from "../components/SandboxFundingBanner";
import { useDepositWalletSetup } from "../hooks/useDepositWalletSetup";
import { useMarketsCollateralBalance } from "../hooks/useMarketsCollateralBalance";
import { FUNDING_PAGE_DESCRIPTION, FUNDING_PAGE_TITLE } from "../lib/fundingCopy";

export function FundingPage() {
  const { isSessionAuthenticated } = useMarketsWalletSession();
  const { accountWallet: fetchedAccountWallet } = useMarketsTradingWallets();
  const setup = useDepositWalletSetup();

  const accountWallet = useMemo(
    () => fetchedAccountWallet ?? setup.linkedAccountWallet,
    [fetchedAccountWallet, setup.linkedAccountWallet],
  );

  const hasLinkedWallet = Boolean(accountWallet);
  const balance = useMarketsCollateralBalance(isSessionAuthenticated && hasLinkedWallet ? accountWallet : undefined);

  return (
    <MarketsShellLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{FUNDING_PAGE_TITLE}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{FUNDING_PAGE_DESCRIPTION}</p>
        </div>

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
    </MarketsShellLayout>
  );
}

export default FundingPage;
