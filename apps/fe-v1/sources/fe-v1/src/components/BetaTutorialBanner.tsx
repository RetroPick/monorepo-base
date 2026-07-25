import { Link } from "react-router-dom";
import Icon from "./Icon";
import { cn } from "@/lib/utils";
import { appDefaultNetwork } from "@/config";

interface BetaTutorialBannerProps {
  /** Compact mode for inline use (e.g. inside cards) */
  compact?: boolean;
  className?: string;
}

/**
 * Game-tutorial style banner shown on every market view.
 * Directs users: This is beta → fund the configured network → Go to Portfolio.
 */
export default function BetaTutorialBanner({ compact = false, className }: BetaTutorialBannerProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/20",
        compact && "p-3",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
          <Icon name="info" className="text-amber-600 dark:text-amber-400 text-lg" />
        </div>
        <div>
          <p className="text-sm font-bold text-amber-800 dark:text-amber-200 flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider bg-amber-500/30 text-amber-900 dark:text-amber-100">
              Beta
            </span>
            This is a beta prediction market
          </p>
          <p className="text-xs text-amber-700/90 dark:text-amber-300/80 mt-0.5">
            To trade: fund your wallet on {appDefaultNetwork.name}, then deposit to your vault.
          </p>
        </div>
      </div>
      <Link
        to="/app/portfolio"
        className={cn(
          "shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs uppercase tracking-wider transition-all border border-amber-600/50 hover:border-amber-500",
          compact && "px-3 py-1.5 text-[10px]"
        )}
      >
        <Icon name="account_balance_wallet" className="text-sm" />
        Go to Portfolio
      </Link>
    </div>
  );
}
