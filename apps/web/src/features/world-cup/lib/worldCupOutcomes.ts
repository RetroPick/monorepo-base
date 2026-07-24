import type { WorldCupLadderOutcomeId } from "../types/worldCup.types";

export const WORLD_CUP_LADDER_OUTCOMES: readonly {
  id: WorldCupLadderOutcomeId;
  label: string;
  index: number;
}[] = [
  { id: "eliminated_group", label: "Eliminated in group stage", index: 0 },
  { id: "round_of_32", label: "Round of 32", index: 1 },
  { id: "round_of_16", label: "Round of 16", index: 2 },
  { id: "quarter_final", label: "Quarter-final", index: 3 },
  { id: "semi_final", label: "Semi-final", index: 4 },
  { id: "final", label: "Final", index: 5 },
  { id: "champion", label: "Champion", index: 6 },
] as const;

export const WORLD_CUP_LADDER_OUTCOME_COUNT = WORLD_CUP_LADDER_OUTCOMES.length;
