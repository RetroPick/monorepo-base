import { Link } from "react-router-dom";
import { Search, TrendingUp } from "lucide-react";

import { cn } from "@/shared/lib/utils";

import { MarketsAppShell } from "../components/shell/MarketsAppShell";
import { DataStateEmpty } from "../components/DataState";
import { INTELLIGENCE_FIXTURES_ENABLED, INTELLIGENCE_SIMULATION_BANNER } from "../intelligence/config/features";
import { FIXTURE_SMART_MONEY, FIXTURE_WHALE_FEED } from "../intelligence/fixtures/devFixtures";
import {
  intelligenceFollowingPath,
  intelligencePaperPath,
  intelligenceSmartMoneyPath,
  walletProfilePath,
} from "../routes/paths";

function SimulationBanner() {
  if (!INTELLIGENCE_FIXTURES_ENABLED) return null;
  return (
    <div
      className="mb-4 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary"
      role="status"
    >
      {INTELLIGENCE_SIMULATION_BANNER}
    </div>
  );
}

export function IntelligenceHubPage() {
  if (!INTELLIGENCE_FIXTURES_ENABLED) {
    return (
      <MarketsAppShell title="Intelligence">
        <DataStateEmpty
          title="Intelligence launching soon"
          description="Whale feed, wallet profiles, and smart money leaderboard will appear when the intelligence backend (I1–I6) ships."
        />
      </MarketsAppShell>
    );
  }

  return (
    <MarketsAppShell title="Intelligence">
      <SimulationBanner />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Whale activity</h1>
          <p className="mt-1 text-sm text-muted-foreground">Large trades on Polymarket · fixture preview</p>
        </div>
        <div className="flex gap-2">
          <Link
            to={intelligenceSmartMoneyPath()}
            className="rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-xs font-bold hover:bg-secondary/60"
          >
            Smart Money
          </Link>
          <Link
            to={intelligenceFollowingPath()}
            className="rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-xs font-bold hover:bg-secondary/60"
          >
            Following
          </Link>
          <Link
            to={intelligencePaperPath()}
            className="rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-xs font-bold hover:bg-secondary/60"
          >
            Paper
          </Link>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          type="search"
          placeholder="Search wallet address…"
          className="w-full rounded-lg border border-border bg-elevated py-2.5 pl-10 pr-4 text-sm outline-none ring-primary focus:ring-2"
          aria-label="Search wallets"
        />
      </div>

      <ul className="space-y-3">
        {FIXTURE_WHALE_FEED.map((item) => (
          <li
            key={item.id}
            className="rounded-xl border border-border bg-card p-4 transition hover:border-primary/30"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  to={walletProfilePath(item.wallet)}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  {item.wallet}
                </Link>
                <p className="mt-1 line-clamp-2 text-sm font-semibold">{item.market}</p>
                <p className="mt-2 text-xs text-muted-foreground">{item.timestamp}</p>
              </div>
              <div className="shrink-0 text-right">
                <span
                  className={cn(
                    "inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase",
                    item.side === "YES" ? "bg-yes-soft text-yes" : "bg-no-soft text-no",
                  )}
                >
                  {item.side}
                </span>
                <p className="mt-2 text-sm font-bold tabular-nums">${item.sizeUsd}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <section className="mt-8">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <TrendingUp className="h-5 w-5 text-primary" aria-hidden />
          Smart Money preview
        </h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="bg-elevated text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Rank</th>
                <th className="px-4 py-2">Wallet</th>
                <th className="px-4 py-2">ROI</th>
                <th className="px-4 py-2">Win rate</th>
              </tr>
            </thead>
            <tbody>
              {FIXTURE_SMART_MONEY.map((row) => (
                <tr key={row.rank} className="border-t border-border">
                  <td className="px-4 py-3 font-bold">{row.rank}</td>
                  <td className="px-4 py-3">
                    <Link to={walletProfilePath(row.wallet)} className="font-mono text-xs text-primary hover:underline">
                      {row.wallet}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-bold text-yes">{row.roi}</td>
                  <td className="px-4 py-3">{row.winRate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </MarketsAppShell>
  );
}

export default IntelligenceHubPage;
