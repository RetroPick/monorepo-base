import { motion } from "framer-motion";
import Icon from "@/components/Icon";
import { MarketOutcome } from "@/types/market";

interface OutcomesTableProps {
  outcomes: MarketOutcome[];
  onBet: (side: 'YES' | 'NO', outcomeLabel: string) => void;
}

const OutcomesTable = ({ outcomes, onBet }: OutcomesTableProps) => {
  // Extended outcomes with mock data for display
  const extendedOutcomes = outcomes.map((o, i) => ({
    ...o,
    volume: i === 0 ? "$24.1M" : i === 1 ? "$18.2M" : "$5.4M",
    change: i === 0 ? 2 : i === 1 ? -3 : -1,
  }));

  return (
    <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/30">
        <div className="flex items-center gap-2">
          <Icon name="bar_chart" className="text-accent-cyan text-lg" />
          <span className="text-sm font-bold text-foreground">Chance</span>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2 rounded-lg hover:bg-secondary/50 transition-colors">
            <Icon name="filter_list" className="text-muted-foreground text-lg" />
          </button>
          <button className="p-2 rounded-lg hover:bg-secondary/50 transition-colors">
            <Icon name="tune" className="text-muted-foreground text-lg" />
          </button>
        </div>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-[1fr,100px,180px] gap-4 px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 border-b border-border/20 bg-secondary/20">
        <span>Outcome</span>
        <span className="text-center">Probability</span>
        <span className="text-center">Price</span>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-border/20">
        {extendedOutcomes.map((outcome, index) => (
          <motion.div
            key={outcome.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="grid grid-cols-[1fr,100px,180px] gap-4 px-6 py-4 hover:bg-secondary/30 transition-all items-center group"
          >
            {/* Outcome */}
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-gradient-to-br from-primary/60 to-accent-cyan/60 flex items-center justify-center text-xs font-bold shadow-lg shadow-primary/20 group-hover:shadow-primary/30 transition-shadow">
                {outcome.label.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <span className="font-medium text-foreground block">{outcome.label}</span>
                <div className="text-[10px] text-muted-foreground/60 font-mono">Vol {outcome.volume}</div>
              </div>
            </div>

            {/* Probability */}
            <div className="flex flex-col items-center">
              <span className="text-lg font-bold text-accent-cyan">{Math.round(outcome.probability)}%</span>
              <div className={`flex items-center gap-0.5 text-[10px] font-bold ${outcome.change > 0 ? 'text-accent-green' : outcome.change < 0 ? 'text-destructive' : 'text-muted-foreground'
                }`}>
                <Icon
                  name={outcome.change > 0 ? "arrow_upward" : outcome.change < 0 ? "arrow_downward" : "remove"}
                  className="text-xs"
                />
                {Math.abs(outcome.change)}%
              </div>
            </div>

            {/* Price Buttons */}
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => onBet('YES', outcome.label)}
                className="px-3 py-2 rounded-lg text-xs font-bold bg-accent-cyan/10 hover:bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/20 hover:border-accent-cyan/40 transition-all hover:shadow-lg hover:shadow-accent-cyan/10"
              >
                Yes {Math.round(outcome.probability)}¢
              </button>
              <button
                onClick={() => onBet('NO', outcome.label)}
                className="px-3 py-2 rounded-lg text-xs font-bold bg-accent-magenta/10 hover:bg-accent-magenta/20 text-accent-magenta border border-accent-magenta/20 hover:border-accent-magenta/40 transition-all hover:shadow-lg hover:shadow-accent-magenta/10"
              >
                No {Math.round(100 - outcome.probability)}¢
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default OutcomesTable;
