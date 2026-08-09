import type { MarketDetail } from "@retropick/polymarket";

import { discoverChipActive, discoverChipIdle, discoverChipPill } from "@/shared/lib/ui/discover-chip-styles";
import { cn } from "@/shared/lib/utils";

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
          className={cn(
            discoverChipPill(),
            selectedTokenId === outcome.upstreamId ? discoverChipActive : discoverChipIdle,
          )}
          onClick={() => onSelect(outcome.upstreamId)}
        >
          {outcome.name}
          {outcome.price ? ` · ${formatProbability(outcome.price)}` : ""}
        </button>
      ))}
    </div>
  );
}
