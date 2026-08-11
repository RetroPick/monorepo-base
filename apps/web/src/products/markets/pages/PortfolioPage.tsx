import { useState } from "react";
import { Link } from "react-router-dom";
import { Wallet } from "lucide-react";

import { CategoryDistributionCard } from "../components/portfolio/CategoryDistributionCard";
import { NetWorthCard, type NetWorthTimeframe } from "../components/portfolio/NetWorthCard";
import { PortfolioOverviewCard } from "../components/portfolio/PortfolioOverviewCard";
import {
  PortfolioTradingPanel,
  type PortfolioMainTab,
  type PortfolioSubTab,
} from "../components/portfolio/PortfolioTradingPanel";
import { ConnectWalletButton } from "../wallet/components/ConnectWalletButton";
import { MarketsAppShell } from "../components/shell/MarketsAppShell";
import { GUEST_CATEGORY_SLICES, GUEST_PORTFOLIO_METRICS } from "../fixtures/portfolioGuest";

export function PortfolioPage() {
  const [timeframe, setTimeframe] = useState<NetWorthTimeframe>("7d");
  const [mainTab, setMainTab] = useState<PortfolioMainTab>("trades");
  const [subTab, setSubTab] = useState<PortfolioSubTab>("position");
  const [hideSmallPositions, setHideSmallPositions] = useState(false);

  return (
    <MarketsAppShell title="Portfolio">
      <div className="mb-4">
        <h1 className="font-display text-2xl font-bold tracking-tight">Portfolio</h1>
        <p className="mt-1 text-sm text-muted-foreground">Positions and activity from RetroPick BFF when PHASE-4 ships</p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex shrink-0 flex-wrap items-center gap-3 rounded-xl border border-border bg-elevated/50 px-4 py-3">
          <Wallet className="size-5 shrink-0 text-primary" aria-hidden />
          <p className="min-w-0 flex-1 text-sm text-muted-foreground">
            Guest preview · connect wallet to unlock balances and trading history.
          </p>
          <ConnectWalletButton
            className="h-10 shrink-0 rounded-lg px-5 text-sm font-bold"
            label="Sign In"
          />
        </div>

        <section className="mt-1 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="grid shrink-0 grid-cols-1 divide-y divide-border lg:grid-cols-12 lg:divide-x lg:divide-y-0">
            <div className="px-4 py-4 lg:col-span-3 lg:py-5">
              <PortfolioOverviewCard surface="plain" isConnected={false} {...GUEST_PORTFOLIO_METRICS} />
            </div>
            <div className="px-4 py-4 lg:col-span-6 lg:w-full lg:self-start lg:py-5">
              <NetWorthCard
                surface="plain"
                title="Exposure and claims"
                compactChart
                netWorthLabel={GUEST_PORTFOLIO_METRICS.totalValueLabel}
                timeframe={timeframe}
                onTimeframeChange={setTimeframe}
              />
            </div>
            <div className="px-4 py-4 lg:col-span-3 lg:py-5">
              <CategoryDistributionCard
                surface="plain"
                aboveFold
                slices={GUEST_CATEGORY_SLICES}
                discoverFilterTitle="Trending"
                showHistoryLink
              />
            </div>
          </div>

          <PortfolioTradingPanel
            surface="plain"
            mainTab={mainTab}
            onMainTabChange={setMainTab}
            subTab={subTab}
            onSubTabChange={setSubTab}
            hideSmallPositions={hideSmallPositions}
            onHideSmallPositionsChange={setHideSmallPositions}
          />
        </section>

        <p className="text-center text-xs text-muted-foreground">
          Browse{" "}
          <Link to="/markets" className="font-semibold text-primary hover:underline">
            Markets
          </Link>{" "}
          while portfolio data is unavailable.
        </p>
      </div>
    </MarketsAppShell>
  );
}

export default PortfolioPage;
