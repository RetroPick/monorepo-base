import { Bookmark, LayoutList, Settings } from "lucide-react";

import { discoverChipActive, discoverChipIdle, discoverChipPill } from "@/shared/lib/ui/discover-chip-styles";
import { cn } from "@/shared/lib/utils";

import { GUEST_POSITIONS } from "../../fixtures/portfolioGuest";

export type PortfolioMainTab = "trades" | "watchlist";
export type PortfolioSubTab = "position" | "open" | "closed" | "transactions" | "resolution";

const mainTabActive = "border-primary text-foreground";
const mainTabIdle = "border-transparent text-muted-foreground hover:text-foreground";

const TRADE_SUB_TABS: { id: PortfolioSubTab; label: string }[] = [
  { id: "position", label: "Position" },
  { id: "open", label: "Open Orders" },
  { id: "closed", label: "Closed Orders" },
  { id: "transactions", label: "Activity" },
  { id: "resolution", label: "Resolution" },
];

export type PortfolioTradingPanelProps = {
  mainTab: PortfolioMainTab;
  onMainTabChange: (t: PortfolioMainTab) => void;
  subTab: PortfolioSubTab;
  onSubTabChange: (t: PortfolioSubTab) => void;
  hideSmallPositions: boolean;
  onHideSmallPositionsChange: (v: boolean) => void;
  surface?: "card" | "plain";
};

export function PortfolioTradingPanel({
  mainTab,
  onMainTabChange,
  subTab,
  onSubTabChange,
  hideSmallPositions,
  onHideSmallPositionsChange,
  surface = "card",
}: PortfolioTradingPanelProps) {
  return (
    <section
      className={cn(
        "flex min-h-0 flex-col overflow-hidden",
        surface === "card" &&
          "rounded-2xl border border-border/60 bg-card p-4 shadow-sm dark:border-white/[0.08] sm:p-5",
        surface === "plain" && "bg-transparent pb-6 pt-1 sm:px-6 sm:pb-8 sm:pt-2",
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
                  className={cn(discoverChipPill(), subTab === id ? discoverChipActive : discoverChipIdle)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              {subTab === "position" ? (
                <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground">
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

          <div className="mt-4 min-h-0 flex-1 overflow-x-auto overflow-y-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead>
                <tr className="border-b border-border/50 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground dark:border-white/[0.08]">
                  <th className="px-3 py-2">Market</th>
                  <th className="px-3 py-2">Outcome</th>
                  <th className="px-3 py-2">Shares</th>
                  <th className="px-3 py-2">Market Value</th>
                  <th className="px-3 py-2">Avg. Cost</th>
                  <th className="px-3 py-2">Last Price</th>
                  <th className="px-3 py-2">Unrealized PnL</th>
                </tr>
              </thead>
              <tbody>
                {GUEST_POSITIONS.map((pos) => (
                  <tr key={pos.id} className="border-b border-border/40 transition-colors last:border-b-0 hover:bg-white/[0.02] dark:border-white/[0.06]">
                    <td className="max-w-[280px] truncate px-3 py-3 font-medium text-foreground" title={pos.market}>
                      {pos.market}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          "inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase",
                          pos.outcome === "YES" ? "bg-yes-soft text-yes" : "bg-no-soft text-no",
                        )}
                      >
                        {pos.outcome}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-mono tabular-nums">{pos.shares}</td>
                    <td className="px-3 py-3 font-mono tabular-nums">{pos.marketValue}</td>
                    <td className="px-3 py-3 font-mono tabular-nums text-muted-foreground">{pos.avgCost}</td>
                    <td className="px-3 py-3 font-mono tabular-nums">{pos.lastPrice}</td>
                    <td
                      className={cn(
                        "px-3 py-3 font-mono font-bold tabular-nums",
                        pos.pnlPositive ? "text-emerald-400" : "text-rose-400",
                      )}
                    >
                      {pos.unrealizedPnl}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={7} className="px-3 pt-3 text-[10px] text-muted-foreground">
                    Guest preview · real positions appear after connecting a wallet (PHASE-4).
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="mt-8 rounded-xl border border-dashed border-border/60 px-4 py-12 text-center text-sm text-muted-foreground dark:border-white/[0.1]">
          <p className="font-medium text-foreground">Watchlist is empty</p>
          <p className="mt-2 text-xs leading-relaxed">Sign in during a later phase to save markets here.</p>
        </div>
      )}
    </section>
  );
}
