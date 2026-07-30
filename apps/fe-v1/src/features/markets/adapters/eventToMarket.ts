import type { EventSummary, MarketSummary } from "@retropick/polymarket";

import type { Market, MarketOutcome } from "@/types/market";
import { formatProbability } from "@/features/markets/lib/decimal";

function priceToProbability(price: string | null | undefined): number {
  if (!price) return 50;
  const parts = price.split(".");
  const whole = Number(parts[0] ?? 0);
  const frac = parts[1] ? Number(`0.${parts[1]}`) : 0;
  if (Number.isNaN(whole) || Number.isNaN(frac)) return 50;
  return Math.round((whole + frac) * 100);
}

function outcomesFromMarket(market: MarketSummary): MarketOutcome[] {
  return market.outcomes.map((o) => ({
    id: o.id,
    label: o.name,
    probability: priceToProbability(o.price),
  }));
}

export function eventSummaryToMarketCard(event: EventSummary): Market {
  const yesOutcome = event.marketCount > 0 ? 50 : 50;
  return {
    id: event.id,
    title: event.title,
    category: event.status,
    icon: "trending_up",
    iconColor: "text-primary",
    description: `${event.marketCount} market${event.marketCount === 1 ? "" : "s"} · Polymarket`,
    outcomes: [
      { id: `${event.id}-yes`, label: "View", probability: yesOutcome },
      { id: `${event.id}-no`, label: "Event", probability: 100 - yesOutcome },
    ],
    volume: "—",
    totalPool: "—",
    isBinary: true,
    status: event.status,
    primitive: "Polymarket",
    marketType: "Event",
  };
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
    totalPool: primary?.price ? formatProbability(primary.price) : "—",
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
