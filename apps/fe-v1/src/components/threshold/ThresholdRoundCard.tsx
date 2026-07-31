import { UnifiedRoundCard } from "@/components/market-round/UnifiedRoundCard";
import type { ThresholdRound } from "@/types/threshold";

interface ThresholdRoundCardProps {
  round: ThresholdRound;
  onRequestLogin?: () => void;
}

export function ThresholdRoundCard({ round, onRequestLogin }: ThresholdRoundCardProps) {
  return <UnifiedRoundCard variant="threshold" round={round} onRequestLogin={onRequestLogin} />;
}
