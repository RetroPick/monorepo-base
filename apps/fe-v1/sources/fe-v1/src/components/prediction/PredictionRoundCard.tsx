import { UnifiedRoundCard } from "@/components/market-round/UnifiedRoundCard";
import type { PredictionRound } from "@/types/prediction";

interface PredictionRoundCardProps {
  round: PredictionRound;
  onRequestLogin?: () => void;
}

export function PredictionRoundCard({ round, onRequestLogin }: PredictionRoundCardProps) {
  return <UnifiedRoundCard variant="direction" round={round} onRequestLogin={onRequestLogin} />;
}
