import { Link } from "react-router-dom";
import { useAccount } from "wagmi";
import { ChevronRight, LayoutGrid, TrendingUp, Wallet } from "lucide-react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { CLAIMABLE_ROUNDS, PORTFOLIO_POSITIONS, PORTFOLIO_SUMMARY } from "@/data/v1App";
import { marketCtaPrimary3d, marketCtaUp3d } from "@/lib/marketCtaStyles";
import { cn } from "@/lib/utils";

const LEADERBOARD = [
  { rank: 1, name: "CryptoKing", pnl: "+$15,200" },
  { rank: 2, name: "SolanaWhale", pnl: "+$12,800" },
  { rank: 3, name: "PredictorX", pnl: "+$10,500" },
  { rank: 4, name: "You", pnl: PORTFOLIO_SUMMARY.settledPnL },
  { rank: 5, name: "MacroMint", pnl: "+$5,000" },
] as const;

function currencyValue(input: string) {
  return Number(input.replace(/[^0-9.-]+/g, ""));
}

function percentValue(input: string) {
  return Number(input.replace("%", ""));
}

function Sparkline({ positive = true }: { positive?: boolean }) {
  return (
    <svg className="h-8 w-full opacity-90" viewBox="0 0 100 28" preserveAspectRatio="none">
      <path
        d={positive ? "M0 22 Q 12 16 22 18 T 44 12 T 66 14 T 88 6 T 100 4" : "M0 6 Q 12 8 22 12 T 44 10 T 66 16 T 88 18 T 100 22"}
        className={cn("fill-none stroke-[2]", positive ? "stroke-emerald-500/90 dark:stroke-emerald-400/90" : "stroke-rose-500/90")}
      />
    </svg>
  );
}

function sideStyle(side: string) {
  const u = side.toUpperCase();
  const isUp = u === "UP" || u === "YES" || u.includes("ABOVE");
  const isDown = u === "DOWN" || u === "NO" || u.includes("BELOW");
  if (isUp) return "border-emerald-500/35 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300";
  if (isDown) return "border-rose-500/35 bg-rose-500/12 text-rose-700 dark:text-rose-300";
  return "border-border/60 bg-muted/40 text-foreground";
}

function statusDot(status: string) {
  const s = status.toLowerCase();
  if (s === "live") return "bg-rose-500";
  if (s === "open") return "bg-emerald-500";
  return "bg-muted-foreground";
}

const Portfolio = () => {
  const { isConnected } = useAccount();
  const claimableTotal = currencyValue(PORTFOLIO_SUMMARY.pendingClaimAmount);
  const totalExposure = PORTFOLIO_POSITIONS.reduce((sum, position) => sum + currencyValue(position.stake), 0);
  const winRate = percentValue(PORTFOLIO_SUMMARY.winRate);
  const liveCount = PORTFOLIO_POSITIONS.filter((position) => position.status === "Live").length;
  const lockedCount = PORTFOLIO_POSITIONS.filter((position) => position.status !== "Live").length;

  const summary = isConnected
    ? PORTFOLIO_SUMMARY
    : {
        ...PORTFOLIO_SUMMARY,
        settledPnL: "—",
        winRate: "—",
        pendingClaimAmount: "—",
      };

  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      <Header />

      <main className="mx-auto max-w-[1440px] px-5 pb-20 pt-10 lg:px-10 lg:pt-12">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Portfolio</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground lg:text-3xl">Positions & performance</h1>
            <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
              Open exposure, settled PnL, and claims in one place — same layout language as Discover and Up vs Down.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/app/markets/all"
              className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-card px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-card-hover dark:border-white/[0.08]"
            >
              <LayoutGrid className="size-4 opacity-70" aria-hidden />
              Discover
            </Link>
            <Link
              to="/app/markets/updown/crypto"
              className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-card px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-card-hover dark:border-white/[0.08]"
            >
              Up vs Down
              <ChevronRight className="size-4 opacity-60" aria-hidden />
            </Link>
          </div>
        </div>

        {!isConnected ? (
          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-3 dark:border-white/[0.1] dark:bg-white/[0.03]">
            <Wallet className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            <p className="min-w-0 flex-1 text-sm text-muted-foreground">
              Connect a wallet to sync live balances. Showing sample numbers below.
            </p>
            <Link
              to="/login"
              className={cn(marketCtaPrimary3d, "shrink-0 px-4 py-2 text-sm font-semibold")}
            >
              Connect
            </Link>
          </div>
        ) : null}

        <section className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4 lg:gap-4">
          <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm transition-colors hover:border-border dark:border-white/[0.08] dark:shadow-none sm:p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Realized PnL</p>
            <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground sm:text-[1.65rem]">{summary.settledPnL}</p>
            <p className="mt-1 text-xs text-muted-foreground">Settled markets only</p>
            {isConnected ? (
              <div className="mt-3">
                <Sparkline positive />
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm dark:border-white/[0.08] dark:shadow-none sm:p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Win rate</p>
            <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight sm:text-[1.65rem]">{summary.winRate}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {liveCount} live · {lockedCount} awaiting resolution
            </p>
            {isConnected ? (
              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Last 30d</span>
                <div
                  className="relative flex size-[4.25rem] shrink-0 items-center justify-center rounded-full"
                  style={{
                    background: `conic-gradient(hsl(var(--primary)) 0% ${winRate}%, hsl(var(--muted)) ${winRate}% 100%)`,
                  }}
                >
                  <div className="absolute inset-2 rounded-full bg-card" />
                  <span className="relative z-10 text-xs font-bold tabular-nums text-foreground">{PORTFOLIO_SUMMARY.winRate}</span>
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm dark:border-white/[0.08] dark:shadow-none sm:p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Available to claim</p>
            <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400 sm:text-[1.65rem]">
              {summary.pendingClaimAmount}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {isConnected
                ? claimableTotal > 0
                  ? `${CLAIMABLE_ROUNDS.length} winning rounds`
                  : "Nothing pending"
                : "Connect to sync claims"}
            </p>
            <button
              type="button"
              disabled={!isConnected}
              className={cn(marketCtaPrimary3d, "mt-4 w-full py-2.5 text-sm font-semibold disabled:pointer-events-none disabled:opacity-40")}
            >
              Claim all
            </button>
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm dark:border-white/[0.08] dark:shadow-none sm:p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">In play</p>
            <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight sm:text-[1.65rem]">
              {isConnected ? `$${totalExposure.toFixed(2)}` : "—"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {isConnected ? `${PORTFOLIO_POSITIONS.length} open positions` : "Connect for live exposure"}
            </p>
            <div className="mt-4 rounded-lg border border-border/50 bg-muted/20 px-3 py-2 dark:border-white/[0.06]">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Exposure</span>
                <span className="font-semibold tabular-nums text-foreground">{isConnected ? `$${totalExposure.toFixed(2)}` : "—"}</span>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-10 flex flex-col gap-10 lg:flex-row lg:gap-12">
          <div className="min-w-0 flex-1 space-y-10">
            <section>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold tracking-tight text-foreground">Open positions</h2>
                <span className="text-xs font-medium text-muted-foreground">{PORTFOLIO_POSITIONS.length} active</span>
              </div>
              <div className="grid gap-3">
                {PORTFOLIO_POSITIONS.map((position) => (
                  <div
                    key={position.id}
                    className="group rounded-xl border border-border/60 bg-card p-4 shadow-sm transition-colors hover:border-border hover:bg-card-hover dark:border-white/[0.08] dark:shadow-none sm:p-4"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                              sideStyle(position.side),
                            )}
                          >
                            {position.side}
                          </span>
                          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            <span className={cn("size-1.5 rounded-full", statusDot(position.status))} aria-hidden />
                            {position.status}
                          </span>
                        </div>
                        <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-snug text-foreground group-hover:text-primary sm:text-[0.95rem]">
                          {position.market}
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Lock {position.lockTime} · Close {position.closeTime}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-row items-center justify-between gap-4 sm:flex-col sm:items-end sm:justify-center sm:text-right">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Stake</p>
                          <p className="mt-0.5 text-lg font-bold tabular-nums text-foreground">{position.stake}</p>
                        </div>
                        <Link
                          to="/app/markets/updown/crypto"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                        >
                          View market
                          <ChevronRight className="size-3.5" aria-hidden />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold tracking-tight text-foreground">Ready to claim</h2>
                <span className="text-xs text-muted-foreground">Settled wins</span>
              </div>
              <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm dark:border-white/[0.08] dark:shadow-none">
                <ul className="divide-y divide-border/50 dark:divide-white/[0.06]">
                  {CLAIMABLE_ROUNDS.map((round) => (
                    <li key={round.id}>
                      <div className="flex flex-col gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm font-semibold text-foreground">{round.market}</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {round.id} · {round.side} · {round.result}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 sm:shrink-0">
                          <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                            {round.amount}
                          </span>
                          <button
                            type="button"
                            disabled={!isConnected}
                            className={cn(
                              marketCtaUp3d,
                              "shrink-0 px-4 py-2 text-xs font-semibold disabled:pointer-events-none disabled:opacity-40",
                            )}
                          >
                            Claim
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </div>

          <aside className="w-full shrink-0 lg:w-[min(100%,20rem)] lg:sticky lg:top-28 lg:self-start">
            <div className="overflow-hidden rounded-xl bg-card shadow-none dark:ring-1 dark:ring-white/[0.04]">
              <div className="flex items-center justify-between border-b border-border/40 px-4 py-3.5 dark:border-white/[0.06]">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-foreground">Leaderboard</span>
                  <TrendingUp className="size-3.5 text-primary" aria-hidden />
                </div>
                <ChevronRight className="size-4 text-muted-foreground/60" aria-hidden />
              </div>
              <ul className="divide-y divide-border/50 dark:divide-white/[0.06]">
                {LEADERBOARD.map((entry) => (
                  <li key={entry.rank}>
                    <div
                      className={cn(
                        "flex items-center justify-between gap-3 px-4 py-3.5",
                        entry.name === "You" && "bg-primary/5",
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted/80 text-xs font-semibold tabular-nums text-muted-foreground">
                          {entry.rank}
                        </span>
                        <span
                          className={cn(
                            "truncate text-sm font-semibold text-foreground",
                            entry.name === "You" && "text-primary",
                          )}
                        >
                          {entry.name}
                        </span>
                      </div>
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{entry.pnl}</span>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="border-t border-border/40 px-4 py-3 dark:border-white/[0.06]">
                <Link
                  to="/app/leaderboard"
                  className="flex w-full items-center justify-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  Full rankings
                  <ChevronRight className="size-3.5" aria-hidden />
                </Link>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-border/60 bg-card/80 p-4 dark:border-white/[0.08]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Activity</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Trade and settlement history lives on{" "}
                <Link to="/app/activity" className="font-semibold text-primary hover:underline">
                  Activity
                </Link>
                .
              </p>
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Portfolio;
