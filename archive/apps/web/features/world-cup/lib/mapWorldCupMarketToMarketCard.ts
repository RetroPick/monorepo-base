import { marketRowToCardMarket } from "@/lib/market-data/chainDiscover";
import type { MarketRow } from "@/lib/api/retropickApi";
import type { WorldCupMarketCard } from "../types/worldCup.types";
import { parseWorldCupMarket } from "./worldCupDerive";

export function mapWorldCupMarketToMarketCard(row: MarketRow): WorldCupMarketCard {
  const parsed = parseWorldCupMarket(row);
  const card = marketRowToCardMarket(row);
  return {
    ...card,
    templateId: row.templateId,
    teamCode: parsed.teamCode,
    group: parsed.group,
  };
}
