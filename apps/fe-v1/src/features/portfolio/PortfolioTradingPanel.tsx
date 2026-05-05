import { Bookmark, LayoutList, Loader2, Settings } from "lucide-react";
import { Link } from "react-router-dom";

import type { ClaimRow, UserChainEventRow } from "@/lib/api/retropickApi";
import { STAKE_TOKEN_DECIMALS } from "@/config/tokens";
import { formatStakeUsd, parseStakeRaw } from "@/features/portfolio/formatStakeUsd";
import { WatchlistResolutionCell } from "@/features/portfolio/WatchlistResolutionCell";
import { normalizeTemplateId } from "@/features/portfolio/watchlistStorage";
import { parseWatchlistSlug } from "@/features/portfolio/watchlistSlugParts";
import { cn } from "@/lib/utils";
import { discoverChipActive, discoverChipIdle, discoverChipPill } from "@/lib/ui/discover-chip-styles";
import { explorerTxUrl, PortfolioTransactionsTable } from "@/features/portfolio/PortfolioTransactionsTable";

export type PortfolioMainTab = "trades" | "watchlist";
export type PortfolioSubTab = "position" | "open" | "closed" | "transactions" | "resolution";

export type WatchlistPanelSub = "markets" | "activity";

export type EnrichedPositionRow = {
  key: string;
  outcome: string;
  marketLine: string;
  shares: string;
  marketValue: string;
  avgCost: string;
  lastPrice: string;
  unrealizedPnl: string;
  templateId: string;
  dominantRaw: bigint;
};

export type WatchlistRowExtra = {
  resolveAtMs: number | null;
  totalPoolLabel: string;
  detailLoading: boolean;
};

const mainTabActive = "border-primary text-foreground";
const mainTabIdle = "border-transparent text-muted-foreground hover:text-foreground";

export type PortfolioTradingPanelProps = {
  mainTab: PortfolioMainTab;
  onMainTabChange: (t: PortfolioMainTab) => void;
  subTab: PortfolioSubTab;
  onSubTabChange: (t: PortfolioSubTab) => void;
  watchlistPanel: WatchlistPanelSub;
  onWatchlistPanelChange: (t: WatchlistPanelSub) => void;
  enrichedPositions: EnrichedPositionRow[];
  positionsLoading: boolean;
  hideSmallPositions: boolean;
  onHideSmallPositionsChange: (v: boolean) => void;
  events: UserChainEventRow[];
  eventsLoading: boolean;
  claims: ClaimRow[];
  claimsLoading: boolean;
  explorerTxBase: string;
  watchlistTemplateIds: string[];
  watchlistLabels: Map<string, string>;
  /** Per-template market detail (resolution, pool) for watchlist + positions tables */
  templateMarketExtras: Map<string, WatchlistRowExtra>;
  /** `plain` merges into a unified dashboard shell (no outer card frame) */
  surface?: "card" | "plain";
  className?: string;
};

const TRADE_SUB_TABS: { id: PortfolioSubTab; label: string }[] = [
  { id: "position", label: "Position" },
  { id: "open", label: "Open Orders" },
  { id: "closed", label: "Closed Orders" },
  { id: "transactions", label: "Activity" },
  { id: "resolution", label: "Resolution" },
];

const WATCHLIST_SUB_TABS: { id: WatchlistPanelSub; label: string }[] = [
  { id: "markets", label: "Markets" },
  { id: "activity", label: "Activity" },
];

export function PortfolioTradingPanel({
  mainTab,
  onMainTabChange,
  subTab,
  onSubTabChange,
  watchlistPanel,
  onWatchlistPanelChange,
  enrichedPositions,
  positionsLoading,
  hideSmallPositions,
  onHideSmallPositionsChange,
  events,
  eventsLoading,
  claims,
  claimsLoading,
  explorerTxBase,
  watchlistTemplateIds,
  watchlistLabels,
  templateMarketExtras,
  surface = "card",
  className,
}: PortfolioTradingPanelProps) {
  const dustThreshold = 10n ** BigInt(Math.max(0, STAKE_TOKEN_DECIMALS - 2));
  const filteredPositions = hideSmallPositions
    ? enrichedPositions.filter((r) => r.dominantRaw >= dustThreshold)
    : enrichedPositions;

  return (
    <section
      className={cn(
        "flex h-full min-h-0 max-h-full flex-col overflow-hidden",
        surface === "card" &&
          "rounded-2xl border border-border/60 bg-card p-4 shadow-sm dark:border-white/[0.08] sm:p-5",
        surface === "plain" && "bg-transparent pb-6 pt-1 sm:px-6 sm:pb-8 sm:pt-2",
        className,
      )}
    >
      <div className="flex shrink-0 flex-wrap items-end gap-4 border-b border-border/50 pb-3 dark:border-white/[0.08]">
        <div className="flex gap-6">
          <button
            type="button"
            onClick={() => onMainTabChange("trades")}
            className={cn(
              "flex items-center gap-2 border-b-2 pb-2 text-sm font-semibold transition-colors duration-150",
              mainTab === "trades" ? mainTabActive : mainTabIdle,
            )}
          >
            <LayoutList className="size-4" aria-hidden />
            Trades
          </button>
          <button
            type="button"
            onClick={() => onMainTabChange("watchlist")}
            className={cn(
              "flex items-center gap-2 border-b-2 pb-2 text-sm font-semibold transition-colors duration-150",
              mainTab === "watchlist" ? mainTabActive : mainTabIdle,
            )}
          >
            <Bookmark className="size-4" aria-hidden />
            Watchlist
            {watchlistTemplateIds.length > 0 ? (
              <span className="ml-0.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-primary">
                {watchlistTemplateIds.length}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      {mainTab === "trades" ? (
        <>
          <div className="mt-4 flex shrink-0 flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Trade filters">
              {TRADE_SUB_TABS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={subTab === id}
                  onClick={() => onSubTabChange(id)}
                  className={cn(
                    discoverChipPill(),
                    subTab === id ? discoverChipActive : discoverChipIdle,
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              {subTab === "position" ? (
                <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground transition-colors duration-150">
                  <input
                    type="checkbox"
                    className="size-3.5 rounded border-border"
                    checked={hideSmallPositions}
                    onChange={(e) => onHideSmallPositionsChange(e.target.checked)}
                  />
                  Hide small positions
                </label>
              ) : null}
              <button
                type="button"
                className="inline-flex size-8 items-center justify-center rounded-full border border-border/35 text-muted-foreground backdrop-blur-sm transition-[background-color,color] hover:bg-muted/50 hover:text-foreground dark:border-white/[0.12]"
                aria-label="Table settings"
              >
                <Settings className="size-4" />
              </button>
            </div>
          </div>

          <div className="mt-4 min-h-0 flex-1 overflow-y-auto overflow-x-auto">
            {subTab === "position" ? (
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground dark:border-white/[0.08]">
                    <th className="px-3 py-2">Outcome</th>
                    <th className="px-3 py-2">Resolution</th>
                    <th className="px-3 py-2">Shares</th>
                    <th className="px-3 py-2">Market Value</th>
                    <th className="px-3 py-2">Avg. Cost</th>
                    <th className="px-3 py-2">Last Price</th>
                    <th className="px-3 py-2">Unrealized PnL</th>
                    <th className="px-3 py-2 text-right"> </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 dark:divide-white/[0.06]">
                  {positionsLoading ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                        <Loader2 className="mx-auto size-5 animate-spin opacity-70" aria-hidden />
                      </td>
                    </tr>
                  ) : null}
                  {!positionsLoading && filteredPositions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">
                        No data yet.
                      </td>
                    </tr>
                  ) : null}
                  {filteredPositions.map((row) => {
                    const tidKey = normalizeTemplateId(row.templateId) ?? row.templateId.trim().toLowerCase();
                    const extra = templateMarketExtras.get(tidKey);
                    const slugLine = row.marketLine;
                    const isBareHexLine = /^0x[a-fA-F0-9]{64}$/.test(slugLine.trim());
                    const resolutionFallback = isBareHexLine ? "-" : parseWatchlistSlug(slugLine).resolutionLabel;
                    return (
                    <tr key={row.key} className="hover:bg-muted/25">
                      <td className="px-3 py-3">
                        <p className="font-semibold text-foreground">{row.outcome}</p>
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{row.marketLine}</p>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <WatchlistResolutionCell
                          resolveAtMs={extra?.resolveAtMs ?? null}
                          fallbackResolutionLabel={resolutionFallback}
                          loading={extra?.detailLoading ?? false}
                        />
                      </td>
                      <td className="px-3 py-3 tabular-nums text-foreground">{row.shares}</td>
                      <td className="px-3 py-3 tabular-nums text-foreground">{row.marketValue}</td>
                      <td className="px-3 py-3 tabular-nums text-muted-foreground">{row.avgCost}</td>
                      <td className="px-3 py-3 tabular-nums text-muted-foreground">{row.lastPrice}</td>
                      <td className="px-3 py-3 tabular-nums">
                        <span
                          className={cn(
                            row.unrealizedPnl.startsWith("+") ? "text-emerald-600 dark:text-emerald-400" : "",
                            row.unrealizedPnl === "-" ? "text-muted-foreground" : "",
                          )}
                        >
                          {row.unrealizedPnl}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Link
                          to={`/app/chain-markets/${encodeURIComponent(row.templateId)}`}
                          className="text-xs font-semibold text-primary hover:underline"
                        >
                          Market
                        </Link>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : null}

            {subTab === "open" || subTab === "closed" ? (
              <div className="rounded-xl border border-dashed border-border/60 px-4 py-12 text-center text-sm text-muted-foreground dark:border-white/[0.1]">
                <p className="font-medium text-foreground">No order book on this deployment</p>
                <p className="mt-2 text-xs leading-relaxed">
                  RetroPick uses continuous on-chain markets. Trade directly from a{" "}
                  <Link to="/app/markets/all" className="font-semibold text-primary hover:underline">
                    market page
                  </Link>
                  .
                </p>
              </div>
            ) : null}

            {subTab === "transactions" ? (
              <PortfolioTransactionsTable
                events={events}
                eventsLoading={eventsLoading}
                explorerTxBase={explorerTxBase}
              />
            ) : null}

            {subTab === "resolution" ? (
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground dark:border-white/[0.08]">
                    <th className="px-3 py-2">Market</th>
                    <th className="px-3 py-2">Epoch</th>
                    <th className="px-3 py-2">Amount</th>
                    <th className="px-3 py-2">Tx</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 dark:divide-white/[0.06]">
                  {claimsLoading ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                        <Loader2 className="mx-auto size-5 animate-spin opacity-70" aria-hidden />
                      </td>
                    </tr>
                  ) : null}
                  {!claimsLoading && claims.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-10 text-center text-muted-foreground">
                        No data yet.
                      </td>
                    </tr>
                  ) : null}
                  {claims.map((c) => (
                    <tr key={`${c.txHash}-${c.id}`} className="hover:bg-muted/25">
                      <td className="px-3 py-3 font-mono text-xs text-foreground">{c.templateId}</td>
                      <td className="px-3 py-3 tabular-nums text-muted-foreground">{c.epochId}</td>
                      <td className="px-3 py-3 font-mono text-xs text-muted-foreground">
                        {(() => {
                          const n = parseStakeRaw(c.eventPayload?.amount);
                          return n !== undefined ? formatStakeUsd(n) : "-";
                        })()}
                      </td>
                      <td className="px-3 py-3 font-mono text-[11px]">
                        <a
                          href={explorerTxUrl(explorerTxBase, c.txHash)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline"
                        >
                          {c.txHash.slice(0, 10)}…
                        </a>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Link
                          to={`/app/chain-markets/${encodeURIComponent(c.templateId)}`}
                          className="text-xs font-semibold text-primary hover:underline"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </div>
        </>
      ) : (
        <>
          <div className="mt-4 flex shrink-0 flex-wrap gap-2" role="tablist" aria-label="Watchlist views">
            {WATCHLIST_SUB_TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={watchlistPanel === id}
                onClick={() => onWatchlistPanelChange(id)}
                className={cn(
                  discoverChipPill(),
                  watchlistPanel === id ? discoverChipActive : discoverChipIdle,
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-4 min-h-0 flex-1 overflow-y-auto overflow-x-auto">
            {watchlistPanel === "activity" ? (
              <PortfolioTransactionsTable
                events={events}
                eventsLoading={eventsLoading}
                explorerTxBase={explorerTxBase}
              />
            ) : watchlistTemplateIds.length === 0 ? (
              <div className="rounded-xl border border-border/50 bg-muted/10 px-4 py-8 text-center dark:border-white/[0.08]">
                <p className="text-sm font-medium text-foreground">Your watchlist is empty</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  On a chain market, use <strong className="text-foreground">Watchlist</strong> in the header, or browse{" "}
                  <Link to="/app/markets/all" className="font-semibold text-primary hover:underline">
                    markets
                  </Link>
                  .
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-border/50 bg-card/30 dark:border-white/[0.08]">
                <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                  <caption className="sr-only">Saved markets on your watchlist</caption>
                  <thead className="sticky top-0 z-[1] border-b border-border/50 bg-muted/30 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur-sm dark:border-white/[0.08] dark:bg-muted/20">
                    <tr>
                      <th scope="col" className="px-3 py-2.5">
                        Market
                      </th>
                      <th scope="col" className="px-3 py-2.5">
                        Resolution
                      </th>
                      <th scope="col" className="px-3 py-2.5">
                        Total pool
                      </th>
                      <th scope="col" className="px-3 py-2.5">
                        Type
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-right">
                        <span className="sr-only">Open market</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 dark:divide-white/[0.06]">
                    {watchlistTemplateIds.map((templateId) => {
                      const slug = watchlistLabels.get(templateId) ?? templateId;
                      const isBareHex = /^0x[a-fA-F0-9]{64}$/.test(slug.trim());
                      const parsed = isBareHex
                        ? {
                            typeLabel: "-",
                            marketLabel: `${slug.slice(0, 10)}…${slug.slice(-6)}`,
                            resolutionLabel: "-",
                            poolLabel: "-",
                          }
                        : parseWatchlistSlug(slug);
                      const extra = templateMarketExtras.get(templateId);
                      return (
                        <tr key={templateId} className="hover:bg-muted/25">
                          <td className="px-3 py-3 align-top">
                            <p className="font-semibold text-foreground">{parsed.marketLabel}</p>
                            <p className="mt-0.5 line-clamp-1 font-mono text-xs text-muted-foreground">{slug}</p>
                          </td>
                          <td className="px-3 py-3 align-top">
                            <WatchlistResolutionCell
                              resolveAtMs={extra?.resolveAtMs ?? null}
                              fallbackResolutionLabel={parsed.resolutionLabel}
                              loading={extra?.detailLoading ?? false}
                            />
                          </td>
                          <td className="px-3 py-3 align-top tabular-nums text-foreground">
                            {extra?.totalPoolLabel ?? "$0.00"}
                          </td>
                          <td className="px-3 py-3 align-top text-foreground">{parsed.typeLabel}</td>
                          <td className="px-3 py-3 align-top text-right">
                            <Link
                              to={`/app/chain-markets/${encodeURIComponent(templateId)}`}
                              className="text-xs font-semibold text-primary hover:underline"
                            >
                              Market
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
