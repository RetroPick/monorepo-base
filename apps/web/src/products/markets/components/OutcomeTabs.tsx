import type { MarketDetail } from "@retropick/polymarket";

import { formatProbability } from "../lib/decimal";

type Outcome = MarketDetail["outcomes"][number];

interface OutcomeTabsProps {
  outcomes: Outcome[];
  selectedTokenId: string;
  onSelect: (tokenId: string) => void;
}

export function OutcomeTabs({ outcomes, selectedTokenId, onSelect }: OutcomeTabsProps) {
  if (outcomes.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Outcomes">
      {outcomes.map((outcome) => (
        <button
          key={outcome.id}
          type="button"
          role="tab"
          aria-selected={selectedTokenId === outcome.upstreamId}
          className={`rounded-full border px-3 py-1.5 text-sm ${
            selectedTokenId === outcome.upstreamId
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground"
          }`}
          onClick={() => onSelect(outcome.upstreamId)}
        >
          {outcome.name}
          {outcome.price ? ` · ${formatProbability(outcome.price)}` : ""}
        </button>
      ))}
    </div>
  );
}
