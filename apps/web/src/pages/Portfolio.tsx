import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { CLAIMABLE_ROUNDS, PORTFOLIO_POSITIONS, PORTFOLIO_SUMMARY } from "@/data/v1App";
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
    <svg className="h-10 w-full" viewBox="0 0 100 30" preserveAspectRatio="none">
      <path
        d={positive ? "M0 24 Q 10 18 18 20 T 36 14 T 56 16 T 76 8 T 100 6" : "M0 8 Q 12 10 20 14 T 42 12 T 60 18 T 80 20 T 100 24"}
        className={cn("fill-none stroke-[2.5]", positive ? "stroke-accent-cyan" : "stroke-accent-magenta")}
      />
    </svg>
  );
}

function SectionCard({
  eyebrow,
  title,
  children,
  className,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[30px] border border-border/60 bg-card/85 p-6 shadow-[0_28px_70px_-46px_rgba(15,23,42,0.28)] backdrop-blur lg:p-8",
        className,
      )}
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">{eyebrow}</div>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
      {children}
    </section>
  );
}

function KpiCard({
  label,
  value,
  note,
  accent = "default",
  children,
}: {
  label: string;
  value: string;
  note: string;
  accent?: "default" | "cyan" | "green";
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-[28px] border border-border/60 bg-card/82 p-5 shadow-[0_24px_60px_-45px_rgba(15,23,42,0.28)] backdrop-blur">
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-2 text-3xl font-semibold tracking-tight text-foreground",
          accent === "cyan" && "text-accent-cyan",
          accent === "green" && "text-emerald-600 dark:text-emerald-400",
        )}
      >
        {value}
      </div>
      <div className="mt-2 text-sm text-muted-foreground">{note}</div>
      {children}
    </div>
  );
}

const Portfolio = () => {
  const claimableTotal = currencyValue(PORTFOLIO_SUMMARY.pendingClaimAmount);
  const totalExposure = PORTFOLIO_POSITIONS.reduce((sum, position) => sum + currencyValue(position.stake), 0);
  const winRate = percentValue(PORTFOLIO_SUMMARY.winRate);
  const liveCount = PORTFOLIO_POSITIONS.filter((position) => position.status === "Live").length;
  const lockedCount = PORTFOLIO_POSITIONS.filter((position) => position.status !== "Live").length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main className="mx-auto max-w-[1440px] px-4 pb-16 pt-3 lg:px-8">
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Realized PnL"
            value={PORTFOLIO_SUMMARY.settledPnL}
            note="Your strongest dopamine trigger should stay tied to settled performance, not open fluctuations."
            accent="cyan"
          >
            <div className="mt-4">
              <Sparkline positive />
            </div>
          </KpiCard>

          <KpiCard
            label="Win Rate"
            value={PORTFOLIO_SUMMARY.winRate}
            note={`${liveCount} live rounds and ${lockedCount} locked positions still unresolved.`}
          >
            <div className="mt-5 flex items-center justify-between gap-4">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Execution quality</div>
              <div
                className="relative flex size-20 items-center justify-center rounded-full"
                style={{
                  background: `conic-gradient(hsl(var(--accent-cyan)) 0% ${winRate}%, hsl(var(--border)) ${winRate}% 100%)`,
                }}
              >
                <div className="absolute inset-[9px] rounded-full bg-card" />
                <span className="relative z-10 text-xs font-bold text-foreground">{PORTFOLIO_SUMMARY.winRate}</span>
              </div>
            </div>
          </KpiCard>

          <KpiCard
            label="Available To Claim"
            value={PORTFOLIO_SUMMARY.pendingClaimAmount}
            note="One-click extraction reduces friction and reinforces payout confidence."
            accent="green"
          >
            <button className="mt-5 w-full rounded-2xl bg-accent-cyan px-4 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-background transition-opacity hover:opacity-90">
              Claim All
            </button>
          </KpiCard>

          <KpiCard
            label="Capital In Play"
            value={`$${totalExposure.toFixed(2)}`}
            note="Exposure is shown separately from PnL to prevent false confidence while rounds remain open."
          >
            <div className="mt-4 rounded-2xl border border-border/60 bg-background/70 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Live allocation</span>
                <span className="font-semibold text-foreground">{PORTFOLIO_POSITIONS.length} positions</span>
              </div>
            </div>
          </KpiCard>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <SectionCard eyebrow="Action Queue" title="Claimable rounds">
              <div className="mt-6 grid gap-4">
                {CLAIMABLE_ROUNDS.map((round, index) => (
                  <div
                    key={round.id}
                    className={cn(
                      "rounded-[26px] border border-border/60 bg-background/72 p-5 transition-colors hover:bg-background/88",
                      index === 0 && "border-accent-cyan/25",
                    )}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="text-lg font-semibold text-foreground">{round.market}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          {round.id} · {round.side} · {round.result}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-emerald-500/12 px-4 py-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                          {round.amount}
                        </div>
                        <button className="rounded-2xl bg-accent-cyan px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-background transition-opacity hover:opacity-90">
                          Claim
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>

          <aside>
            <SectionCard eyebrow="Competitive Context" title="Leaderboard">
              <div className="mt-6 space-y-3">
                {LEADERBOARD.map((entry) => (
                  <div
                    key={entry.rank}
                    className={cn(
                      "flex items-center justify-between rounded-[22px] border border-border/60 bg-background/72 px-4 py-3",
                      entry.name === "You" && "border-accent-cyan/30 bg-accent-cyan/8",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-full bg-card/80 text-sm font-semibold text-muted-foreground">
                        {entry.rank}
                      </div>
                      <div className={cn("font-semibold text-foreground", entry.name === "You" && "text-accent-cyan")}>{entry.name}</div>
                    </div>
                    <div className="font-semibold text-emerald-600 dark:text-emerald-400">{entry.pnl}</div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </aside>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Portfolio;
