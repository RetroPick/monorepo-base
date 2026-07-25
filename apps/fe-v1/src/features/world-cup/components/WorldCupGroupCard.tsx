import type { WorldCupGroup } from "../types/worldCup.types";
import { WorldCupFlagIcon } from "./WorldCupFlagIcon";
import WorldCupPredictionCard from "./WorldCupPredictionCard";

type WorldCupGroupCardProps = {
  group: WorldCupGroup;
};

export default function WorldCupGroupCard({ group }: WorldCupGroupCardProps) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-lg font-extrabold text-foreground">{group.letter}</span>
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Group</span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {group.teams.map((team) => (
          <div key={team.code} className="flex items-center gap-1.5 rounded-lg border border-border/40 px-2 py-1.5">
            <WorldCupFlagIcon code={team.code} />
            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">{team.name}</span>
            {team.predictionPercent != null ? (
              <span className="text-[10px] font-bold tabular-nums text-primary">{team.predictionPercent}%</span>
            ) : null}
          </div>
        ))}
      </div>
      {group.teams[0]?.market?.templateId ? (
        <div className="mt-3">
          <WorldCupPredictionCard
            teamCode={group.teams[0].code}
            teamName={`Group ${group.letter} winner forecast`}
            templateId={group.teams[0].market.templateId}
            predictionPercent={group.teams[0].predictionPercent}
            subtitle="Predict group winner progression"
          />
        </div>
      ) : null}
    </div>
  );
}
