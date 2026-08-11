"use client";

import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Coins } from "lucide-react";

import { MarketsAppShell } from "../../components/shell/MarketsAppShell";
import { useMarketsTradingWallets } from "../../wallet/hooks/useMarketsTradingWallets";
import { useMarketsWalletSession } from "../../wallet/hooks/useMarketsWalletSession";
import { ConnectWalletButton } from "../../wallet/components/ConnectWalletButton";
import { walletConnectPath } from "../../routes/paths";

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
    <MarketsAppShell title="Funding" hideBottomNav>
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-3 text-primary">
            <Coins className="h-6 w-6" aria-hidden />
            <h1 className="font-display text-2xl font-bold">{FUNDING_PAGE_TITLE}</h1>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{FUNDING_PAGE_DESCRIPTION}</p>
        </header>

        {!isSessionAuthenticated ? (
          <div className="rounded-xl border border-dashed border-border bg-elevated/40 px-6 py-8 text-center">
            <p className="text-sm text-muted-foreground">Connect and sign in to manage deposit wallet and balances.</p>
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
    </MarketsAppShell>
  );
}

export default FundingPage;
