import type { MarketRow } from "@/lib/api/retropickApi";
import type { Market } from "@/types/market";

export type WorldCupMarketStatus = "open" | "locked" | "resolved" | "setup" | "syncing";

export type WorldCupStage =
  | "group-stage"
  | "round-of-32"
  | "quarter-final"
  | "winner"
  | "bracket"
  | "stats"
  | "awards";

export type WorldCupLadderOutcomeId =
  | "eliminated_group"
  | "round_of_32"
  | "round_of_16"
  | "quarter_final"
  | "semi_final"
  | "final"
  | "champion";

export type WorldCupParsedMarket = {
  row: MarketRow;
  templateId: string;
  slug: string;
  teamCode: string;
  teamName: string;
  group: string | null;
  stage: WorldCupStage | null;
  marketType: "LADDER";
  lockTime: string | null;
  status: WorldCupMarketStatus;
  route: string;
};

export type WorldCupTeam = {
  code: string;
  name: string;
  group: string | null;
  market: WorldCupParsedMarket | null;
  predictionPercent: number | null;
};

export type WorldCupGroup = {
  letter: string;
  teams: WorldCupTeam[];
};

export type WorldCupMatch = {
  id: string;
  group: string;
  date: string;
  team1: { name: string; code: string; percent: number | null; templateId?: string };
  team2: { name: string; code: string; percent: number | null; templateId?: string };
  templateId?: string;
};

export type WorldCupGroupStanding = {
  teamCode: string;
  teamName: string;
  played: number | null;
  won: number | null;
  drawn: number | null;
  lost: number | null;
  goalsFor: number | null;
  goalsAgainst: number | null;
  points: number | null;
  predictionPercent: number | null;
  templateId: string | null;
};

export type WorldCupGroupStats = {
  group: string;
  standings: WorldCupGroupStanding[];
  upcomingMatches: WorldCupMatch[];
};

export type WorldCupMarketCard = Market & {
  templateId: string;
  teamCode: string;
  group: string | null;
};
