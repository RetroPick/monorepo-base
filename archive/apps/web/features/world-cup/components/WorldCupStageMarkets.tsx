import type { WorldCupStage } from "../types/worldCup.types";
import { useWorldCupMarketsByStage } from "../hooks/useWorldCupMarketsByStage";
import WorldCupMarketCard from "./WorldCupMarketCard";
import { WorldCupEmptyState } from "./WorldCupEmptyState";

const STAGE_COPY: Record<WorldCupStage, { title: string; description: string }> = {
  "group-stage": {
    title: "Group stage progression",
    description: "Predict how far each team advances from the group stage.",
  },
  "round-of-32": {
    title: "Round of 32",
    description: "Forecast teams reaching the round of 32 and beyond.",
  },
  "quarter-final": {
    title: "Quarter-finals",
    description: "Markets focused on quarter-final and deeper progression paths.",
  },
  winner: {
    title: "World Cup winner",
    description: "Champion and final-stage progression forecasts.",
  },
  bracket: { title: "", description: "" },
  stats: { title: "", description: "" },
  awards: { title: "", description: "" },
};

type WorldCupStageMarketsProps = {
  stage: WorldCupStage;
};

export default function WorldCupStageMarkets({ stage }: WorldCupStageMarketsProps) {
  const marketsQ = useWorldCupMarketsByStage(stage);
  const markets = marketsQ.data ?? [];
  const copy = STAGE_COPY[stage];

  return (
    <section data-testid={`world-cup-stage-${stage}`}>
      <div className="mb-4">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">{copy.title}</h2>
        <p className="text-sm text-muted-foreground">{copy.description}</p>
      </div>

      {marketsQ.isLoading ? <p className="text-sm text-muted-foreground">Loading markets…</p> : null}

      {!marketsQ.isLoading && markets.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {markets.map((market) => (
            <WorldCupMarketCard key={market.templateId} market={market} />
          ))}
        </div>
      ) : null}

      {!marketsQ.isLoading && markets.length === 0 ? (
        <WorldCupEmptyState
          title="No markets for this stage"
          description="Progression markets appear when indexed with world-cup slug prefix and LADDER type (7 outcomes)."
        />
      ) : null}
    </section>
  );
}
