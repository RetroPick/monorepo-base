import { Link } from "react-router-dom";
import { TrendingUp } from "lucide-react";

import { discoverPath } from "../../routes/paths";

const MARKET_TYPES = [
  { title: "Binary", description: "Yes / No outcomes" },
  { title: "Multi", description: "Several outcomes" },
  { title: "Events", description: "Grouped markets" },
] as const;

export function DiscoverMarketTypesStrip() {
  return (
    <section aria-label="Market types">
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
        {MARKET_TYPES.map((type) => (
          <Link
            key={type.title}
            to={discoverPath()}
            className="flex min-w-[140px] shrink-0 flex-col rounded-xl border border-border/60 bg-card px-4 py-3 shadow-sm transition hover:border-primary/40 dark:border-white/[0.08]"
          >
            <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <TrendingUp className="size-4 text-primary" aria-hidden />
              {type.title}
            </span>
            <span className="mt-1 text-xs text-muted-foreground">{type.description}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
