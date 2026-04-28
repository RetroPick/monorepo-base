import type { Market } from "@/types/market";
import { buildDiscoverSubtitle } from "@/lib/market-data/discoverMarketClassification";

function firstOutcomeYesPercent(market: Market) {
  const y =
    market.outcomes.find((o) => /^(yes|up)\b/i.test(o.label)) ?? market.outcomes[0];
  if (y) return Math.round(y.probability);
  return 50;
}

/** Implied “yes / up” share for rail list until list API includes pool totals. */
export function yesPercentFromPools(market: Market) {
  return firstOutcomeYesPercent(market);
}

/** One line under title for discover rail — type, Manual/Rolling, slug when indexer fields are present. */
export function discoverListSubtitle(market: Market) {
  return buildDiscoverSubtitle(market);
}
