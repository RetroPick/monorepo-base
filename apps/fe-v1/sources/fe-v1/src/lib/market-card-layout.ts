import type { Market } from "@/types/market";

/**
 * Card layout (UI), not on-chain `marketType`.
 *
 * - **`multi`** — **Stacked Yes/No**: each outcome row is its **own** binary question (like N separate Yes/No markets).
 *   **Not** the same rules as range — only the **strip row layout** (label · stats · actions) matches range for consistency.
 * - **`range`** — **One** mutually exclusive contest: liquidity split across bins, **exactly one** bracket wins; rows show pool share, not Yes/No pairs.
 * - **`binary-yesno`** — A **single** two-outcome Yes/No question (compact card).
 * - **`updown`** — Directional Up vs Down.
 */
export type MarketCardLayoutKind = "multi" | "range" | "binary-yesno" | "updown";

/** Price bins / one winner — tag with `primitive` or `category` `Range`. */
export function isRangeMarket(market: Market): boolean {
  const p = (market.primitive ?? "").trim().toLowerCase();
  const c = (market.category ?? "").trim().toLowerCase();
  return p === "range" || c === "range";
}

export function pickBinaryOutcomes(market: Market) {
  const yes =
    market.outcomes.find((o) => /^(yes|up)\b/i.test(o.label.trim())) ??
    market.outcomes.find((o) => o.label.toUpperCase() === "YES") ??
    market.outcomes[0];
  const no =
    market.outcomes.find((o) => /^(no|down)\b/i.test(o.label.trim())) ??
    market.outcomes.find((o) => o.label.toUpperCase() === "NO") ??
    market.outcomes[1];
  return { yes, no };
}

export function isUpDownPresentation(market: Market) {
  if (market.binaryPresentation === "updown") return true;
  const { yes, no } = pickBinaryOutcomes(market);
  if (!yes || !no) return false;
  const a = yes.label.trim().toLowerCase();
  const b = no.label.trim().toLowerCase();
  return (a === "up" && b === "down") || (a === "down" && b === "up");
}

/**
 * Resolve card layout in order: **range → multi → updown → binary-yesno**.
 */
export function resolveMarketCardLayout(market: Market): MarketCardLayoutKind {
  if (isRangeMarket(market)) {
    return "range";
  }

  // Multi Yes/No (stacked binary lines): not exactly one compact two-outcome contract.
  if (!market.isBinary || market.outcomes.length !== 2) {
    return "multi";
  }

  const { yes, no } = pickBinaryOutcomes(market);
  if (!yes || !no) {
    return "multi";
  }
  if (isUpDownPresentation(market)) {
    return "updown";
  }
  return "binary-yesno";
}
