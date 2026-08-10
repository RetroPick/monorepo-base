import { useState } from "react";
import { Link } from "react-router-dom";
import { Wallet } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { DISCOVERY_VERTICALS, type DiscoveryVerticalId } from "@/shared/lib/discovery-verticals";

import { CategoryDistributionCard } from "../components/portfolio/CategoryDistributionCard";
import { NetWorthCard, type NetWorthTimeframe } from "../components/portfolio/NetWorthCard";
import { PortfolioOverviewCard } from "../components/portfolio/PortfolioOverviewCard";
import {
  PortfolioTradingPanel,
  type PortfolioMainTab,
  type PortfolioSubTab,
} from "../components/portfolio/PortfolioTradingPanel";
import { MarketsShellLayout } from "../components/MarketsShellLayout";
import { GUEST_CATEGORY_SLICES, GUEST_PORTFOLIO_METRICS } from "../fixtures/portfolioGuest";

export function PortfolioPage() {
  const [portfolioDiscoverVertical, setPortfolioDiscoverVertical] = useState<DiscoveryVerticalId>("trending");
  const [timeframe, setTimeframe] = useState<NetWorthTimeframe>("7d");
  const [mainTab, setMainTab] = useState<PortfolioMainTab>("trades");
  const [subTab, setSubTab] = useState<PortfolioSubTab>("position");
  const [hideSmallPositions, setHideSmallPositions] = useState(false);

  const discoverTitle = DISCOVERY_VERTICALS.find((v) => v.id === portfolioDiscoverVertical)?.title ?? "Trending";

  return (
    <MarketsShellLayout
      portfolioDiscoverNav={{
        verticals: DISCOVERY_VERTICALS,
        activeVerticalId: portfolioDiscoverVertical,
        onVerticalChange: setPortfolioDiscoverVertical,
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <div className="flex shrink-0 flex-wrap items-center gap-3 rounded-xl border border-dashed border-border/80 bg-muted/20 px-3 py-2.5 dark:border-white/[0.1] dark:bg-white/[0.03]">
          <Wallet className="size-5 shrink-0 text-muted-foreground" aria-hidden />
          <p className="min-w-0 flex-1 text-sm text-muted-foreground">
            Guest preview · connect wallet in a later phase. Use <strong className="text-foreground">Sign Up</strong> or{" "}
            <strong className="text-foreground">Sign In</strong> in the header when auth ships.
          </p>
          <Button type="button" variant="default" className="h-10 shrink-0 px-5 text-sm font-semibold">
            Sign Up
          </Button>
        </div>

        <section className="mt-1 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm dark:border-white/[0.08]">
          <div className="grid shrink-0 grid-cols-1 divide-y divide-border/50 lg:grid-cols-12 lg:divide-x lg:divide-y-0 dark:divide-white/[0.08]">
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
                discoverFilterTitle={discoverTitle}
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
          Browse <Link to="/markets" className="font-semibold text-primary hover:underline">Markets</Link> while portfolio data is unavailable.
        </p>
      </div>
    </MarketsShellLayout>
  );
}

export default PortfolioPage;
