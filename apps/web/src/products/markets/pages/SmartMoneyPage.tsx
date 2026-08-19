import { Link } from "react-router-dom";
import { Crown } from "lucide-react";

import { cn } from "@/shared/lib/utils";

import { MarketsAppShell } from "../components/shell/MarketsAppShell";
import { DataStateEmpty } from "../components/DataState";
import { INTELLIGENCE_FIXTURES_ENABLED, INTELLIGENCE_SIMULATION_BANNER } from "../intelligence/config/features";
import { FIXTURE_SMART_MONEY } from "../intelligence/fixtures/devFixtures";
import { intelligencePath, walletProfilePath } from "../routes/paths";

const RANK_MEDAL: Record<number, { emoji: string; className: string }> = {
  1: { emoji: "🥇", className: "border-amber-400/40 bg-amber-400/10" },
  2: { emoji: "🥈", className: "border-slate-300/30 bg-slate-300/10" },
  3: { emoji: "🥉", className: "border-orange-400/40 bg-orange-400/10" },
};

function shortWallet(wallet: string): string {
  return wallet.length > 12 ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : wallet;
}

export function SmartMoneyPage() {
  if (!INTELLIGENCE_FIXTURES_ENABLED) {
    return (
      <MarketsAppShell title="Smart Money">
        <DataStateEmpty title="Smart Money unavailable" description="Ships with intelligence I3." />
      </MarketsAppShell>
    );
  }

  return (
    <MarketsAppShell title="Smart Money">
      <div className="mb-4 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary">
        {INTELLIGENCE_SIMULATION_BANNER}
      </div>
      <Link to={intelligencePath()} className="text-xs font-bold text-primary hover:underline">
        ← Whale feed
      </Link>
      <h1 className="mt-4 flex items-center gap-2 font-display text-2xl font-bold">
        <Crown className="h-5 w-5 text-amber-400" aria-hidden />
        Smart Money leaderboard
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">Top performers by ROI · fixture preview</p>

      <ul className="mt-6 space-y-2">
        {FIXTURE_SMART_MONEY.map((row) => {
          const medal = RANK_MEDAL[row.rank];
          return (
            <li
              key={row.rank}
              className="card-surface flex items-center gap-4 rounded-xl border border-border px-4 py-3 transition hover:border-primary/30"
            >
              {medal ? (
                <span
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-full border text-base",
                    medal.className,
                  )}
                  aria-label={`Rank ${row.rank}`}
                >
                  {medal.emoji}
                </span>
              ) : (
                <span className="grid size-9 shrink-0 place-items-center font-bold text-muted-foreground">
                  #{row.rank}
                </span>
              )}
              <Link
                to={walletProfilePath(row.wallet)}
                className="min-w-0 flex-1 font-mono text-xs font-bold text-primary hover:underline"
              >
                {shortWallet(row.wallet)}
              </Link>
              <span className="hidden text-xs text-muted-foreground sm:inline">Win {row.winRate}</span>
              <span className="hidden font-mono text-xs text-muted-foreground md:inline">{row.volumeUsd} vol</span>
              <div className="w-24 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <div className="h-1.5 w-14 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-300"
                      style={{ width: `${Math.min(100, Number.parseInt(row.roi, 10))}%` }}
                    />
                  </div>
                  <span className="font-bold text-yes">{row.roi}</span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </MarketsAppShell>
  );
}

export default SmartMoneyPage;
