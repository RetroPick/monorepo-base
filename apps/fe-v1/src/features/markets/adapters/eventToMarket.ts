import type { EventSummary, MarketSummary } from "@retropick/polymarket";

import type { Market, MarketOutcome } from "@/types/market";
import {
  formatProbabilityPercent,
  probabilityDecimalToCardPercent,
  parseProbabilityDecimal,
} from "@/features/markets/lib/probability";

function outcomesFromMarket(market: MarketSummary): MarketOutcome[] {
  return market.outcomes.map((outcome) => {
    const parsed = parseProbabilityDecimal(outcome.price);
    if (!parsed.ok) {
      return {
        id: outcome.id,
        label: outcome.name,
        probabilityUnavailable: true,
      };
    }
    return {
      id: outcome.id,
      label: outcome.name,
      probability: probabilityDecimalToCardPercent(outcome.price) ?? undefined,
    };
  });
}

export function marketSummaryToMarketCard(market: MarketSummary): Market {
  const outcomes = outcomesFromMarket(market);
  const primary = market.outcomes[0];
  return {
    id: market.id,
    title: market.question,
    category: market.status,
    icon: "analytics",
    iconColor: "text-primary",
    description: market.slug ?? market.conditionId,
    outcomes,
    volume: "—",
    totalPool: primary?.price ? formatProbabilityPercent(primary.price) : "Unavailable",
    isBinary: outcomes.length <= 2,
    status: market.status,
    primitive: "Polymarket",
    marketType: "Binary",
    oracleSource: market.provenance.source,
  };
}

export function isPolymarketResourceId(id: string): boolean {
  return id.startsWith("polymarket:");
}
