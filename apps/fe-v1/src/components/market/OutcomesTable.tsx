import { motion } from "framer-motion";
import Icon from "@/components/Icon";
import { MarketOutcome } from "@/types/market";

interface OutcomesTableProps {
  outcomes: MarketOutcome[];
  onBet: (side: "YES" | "NO", outcomeLabel: string) => void;
}

const OutcomesTable = ({ outcomes, onBet }: OutcomesTableProps) => {
  const extendedOutcomes = outcomes.map((o, i) => ({
    ...o,
    volume: i === 0 ? "$24.1M" : i === 1 ? "$18.2M" : "$5.4M",
    change: i === 0 ? 2 : i === 1 ? -3 : -1,
  }));

  return (
    <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/30 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <Icon name="bar_chart" className="text-accent-cyan text-lg" />
          <span className="text-sm font-bold text-foreground">Chance</span>
        </div>
        <div className="flex items-center gap-1">
          <button className="rounded-lg p-2 transition-colors hover:bg-secondary/50">
            <Icon name="filter_list" className="text-muted-foreground text-lg" />
          </button>
          <button className="rounded-lg p-2 transition-colors hover:bg-secondary/50">
            <Icon name="tune" className="text-muted-foreground text-lg" />
          </button>
        </div>
      </div>

      <div className="hidden border-b border-border/20 bg-secondary/20 px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 sm:grid sm:grid-cols-[minmax(0,1fr)_100px_180px] sm:gap-4">
        <span>Outcome</span>
        <span className="text-center">Probability</span>
        <span className="text-center">Price</span>
      </div>

      <div className="divide-y divide-border/20">
        {extendedOutcomes.map((outcome, index) => {
          const direction =
            outcome.change > 0 ? "up" : outcome.change < 0 ? "down" : "flat";
          const changeClass =
            direction === "up"
              ? "text-accent-green"
              : direction === "down"
                ? "text-destructive"
                : "text-muted-foreground";
          const arrowIcon =
            direction === "up"
              ? "arrow_upward"
              : direction === "down"
                ? "arrow_downward"
                : "remove";

          return (
            <motion.div
              key={outcome.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="group flex flex-col gap-3 px-4 py-4 transition-all hover:bg-secondary/30 sm:grid sm:grid-cols-[minmax(0,1fr)_100px_180px] sm:items-center sm:gap-4 sm:px-6"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/60 to-accent-cyan/60 text-xs font-bold shadow-lg shadow-primary/20 transition-shadow group-hover:shadow-primary/30">
                  {outcome.label.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <span className="block truncate font-medium text-foreground">{outcome.label}</span>
                  <div className="font-mono text-[10px] text-muted-foreground/60">Vol {outcome.volume}</div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 sm:contents">
                <div className="flex flex-col items-start sm:items-center">
                  <div className="flex items-baseline gap-1.5 sm:flex-col sm:items-center sm:gap-0">
                    <span className="text-lg font-bold text-accent-cyan">{Math.round(outcome.probability)}%</span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 sm:hidden">
                      chance
                    </span>
                  </div>
                  <div className={"flex items-center gap-0.5 text-[10px] font-bold " + changeClass}>
                    <Icon name={arrowIcon} className="text-xs" />
                    {Math.abs(outcome.change)}%
                  </div>
                </div>

                <div className="flex justify-end gap-2 sm:justify-center">
                  <button
                    onClick={() => onBet("YES", outcome.label)}
                    className="rounded-lg border border-accent-cyan/20 bg-accent-cyan/10 px-3 py-2 text-xs font-bold text-accent-cyan transition-all hover:border-accent-cyan/40 hover:bg-accent-cyan/20 hover:shadow-lg hover:shadow-accent-cyan/10"
                  >
                    Yes {Math.round(outcome.probability)}¢
                  </button>
                  <button
                    onClick={() => onBet("NO", outcome.label)}
                    className="rounded-lg border border-accent-magenta/20 bg-accent-magenta/10 px-3 py-2 text-xs font-bold text-accent-magenta transition-all hover:border-accent-magenta/40 hover:bg-accent-magenta/20 hover:shadow-lg hover:shadow-accent-magenta/10"
                  >
                    No {Math.round(100 - outcome.probability)}¢
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default OutcomesTable;
