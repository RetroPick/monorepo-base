import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { chainDetailPath } from "@/lib/market-data/chainDiscover";
import { WorldCupFlagIcon } from "./WorldCupFlagIcon";
import { WorldCupProbabilityBar } from "./WorldCupProbabilityBar";

type WorldCupPredictionCardProps = {
  teamCode: string;
  teamName: string;
  templateId: string | null;
  predictionPercent: number | null;
  subtitle?: string;
  className?: string;
};

export default function WorldCupPredictionCard({
  teamCode,
  teamName,
  templateId,
  predictionPercent,
  subtitle = "Tournament progression market",
  className,
}: WorldCupPredictionCardProps) {
  const inner = (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <WorldCupFlagIcon code={teamCode} className="h-4 w-5" />
          <span className="truncate text-sm font-semibold text-foreground">{teamName}</span>
        </div>
        <span className="shrink-0 text-sm font-bold tabular-nums text-primary">
          {predictionPercent != null ? `${predictionPercent}%` : "—"}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      <WorldCupProbabilityBar percent={predictionPercent} className="mt-2" />
      {templateId ? (
        <span className="mt-3 inline-block text-xs font-semibold text-primary">Predict progression →</span>
      ) : (
        <span className="mt-3 inline-block text-xs text-muted-foreground">Market pending</span>
      )}
    </>
  );

  if (!templateId) {
    return (
      <div className={cn("rounded-xl border border-border/60 bg-card/50 p-4 opacity-80", className)}>{inner}</div>
    );
  }

  return (
    <Link
      to={chainDetailPath(templateId)}
      className={cn(
        "block rounded-xl border border-border/60 bg-card p-4 transition-colors hover:border-primary/40",
        className,
      )}
    >
      {inner}
    </Link>
  );
}
