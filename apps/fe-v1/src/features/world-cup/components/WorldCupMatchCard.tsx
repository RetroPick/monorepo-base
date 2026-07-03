import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { chainDetailPath } from "@/lib/market-data/chainDiscover";
import type { WorldCupMatch } from "../types/worldCup.types";
import { WorldCupFlagIcon } from "./WorldCupFlagIcon";
import { WorldCupProbabilityBar } from "./WorldCupProbabilityBar";

type WorldCupMatchCardProps = {
  match: WorldCupMatch;
  className?: string;
};

function TeamRow({
  name,
  code,
  percent,
}: {
  name: string;
  code: string;
  percent: number | null;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <WorldCupFlagIcon code={code} className="h-4 w-5" />
          <span className="truncate text-sm font-semibold text-foreground">{name}</span>
        </div>
        <span className="shrink-0 text-sm font-bold tabular-nums text-foreground">
          {percent != null ? `${percent}%` : "—"}
        </span>
      </div>
      <WorldCupProbabilityBar percent={percent} />
    </div>
  );
}

export default function WorldCupMatchCard({ match, className }: WorldCupMatchCardProps) {
  const content = (
    <>
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {match.group}
        </span>
        <span className="text-[11px] text-muted-foreground">{match.date}</span>
      </div>
      <TeamRow name={match.team1.name} code={match.team1.code} percent={match.team1.percent} />
      <div className="my-2 text-center text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
        vs
      </div>
      <TeamRow name={match.team2.name} code={match.team2.code} percent={match.team2.percent} />
    </>
  );

  if (match.templateId) {
    return (
      <Link
        to={chainDetailPath(match.templateId)}
        className={cn(
          "block rounded-xl border border-border/60 bg-card p-4 transition-colors hover:border-primary/40",
          className,
        )}
      >
        {content}
      </Link>
    );
  }

  return <div className={cn("rounded-xl border border-border/60 bg-card p-4", className)}>{content}</div>;
}
