import type { ClaimRow, MarketRow, UserChainEventRow } from "@/lib/api/retropickApi";
import { STAKE_TOKEN_DECIMALS } from "@/config/tokens";
import type { DiscoveryVerticalId } from "@/lib/discovery-verticals";
import { inferCryptoFromSlug, isDiscoverCryptoRow } from "@/lib/market-data/chainDiscover";
import { parseStakeRaw, sumNumericStringKey } from "@/features/portfolio/formatStakeUsd";

/** Portfolio donut / legend buckets, aligned with Discover verticals (no legacy Sports/Politics strip). */
export type PortfolioCategoryId = "crypto" | "economics" | "financials" | "tech_science" | "climate" | "other";

const CATEGORY_ORDER: PortfolioCategoryId[] = [
  "crypto",
  "economics",
  "financials",
  "tech_science",
  "climate",
  "other",
];

const CATEGORY_LABEL: Record<PortfolioCategoryId, string> = {
  crypto: "Crypto",
  economics: "Economics",
  financials: "Financials",
  tech_science: "Tech & Science",
  climate: "Climate",
  other: "Others",
};

/** Distinct slice colors for the donut + legend. */
export const CATEGORY_COLOR: Record<PortfolioCategoryId, string> = {
  crypto: "hsl(215 90% 58%)",
  economics: "hsl(32 88% 52%)",
  financials: "hsl(292 48% 52%)",
  tech_science: "hsl(199 70% 50%)",
  climate: "hsl(142 70% 46%)",
  other: "hsl(228 10% 45%)",
};

/** Slug heuristics aligned with `positionMatchesDiscoveryVertical` (non-crypto tabs). */
function portfolioCategoryFromSlug(slug: string): PortfolioCategoryId {
  const s = slug.toLowerCase();
  if (
    /\b(fed|gdp|inflation|cpi|unemployment|recession|macro|central bank|interest rate|fomc|economy|deficit|treasury)\b/.test(
      s,
    )
  ) {
    return "economics";
  }
  if (/\b(stock|nasdaq|sp500|s&p|earnings|merger|bank|bond|ipo|sec|etf|nyse|dow)\b/.test(s)) {
    return "financials";
  }
  if (/\b(ai|tech|science|chip|spacex|nasa|quantum|software|hardware|robot|llm|neural|openai)\b/.test(s)) {
    return "tech_science";
  }
  if (/\b(climate|carbon|environment|green|renewable|warming|emission|solar|cop\d)\b/.test(s)) {
    return "climate";
  }
  return "other";
}

export function inferPortfolioCategory(row: MarketRow | undefined, slugFallback: string): PortfolioCategoryId {
  if (row && isDiscoverCryptoRow(row)) return "crypto";
  if (inferCryptoFromSlug(slugFallback)) return "crypto";
  const fromSlug = portfolioCategoryFromSlug(slugFallback);
  if (fromSlug !== "other") return fromSlug;
  return "other";
}

/**
 * Whether a position’s market belongs in the given Discover strip bucket (portfolio donut filter).
 * Trending = no filter. Non-crypto tabs use slug heuristics (aligned with empty Discover grids for those tabs).
 */
export function positionMatchesDiscoveryVertical(
  vertical: DiscoveryVerticalId,
  row: MarketRow | undefined,
  slug: string,
): boolean {
  if (vertical === "trending") return true;
  const s = slug.toLowerCase();
  if (vertical === "crypto") {
    if (row) return isDiscoverCryptoRow(row);
    return inferCryptoFromSlug(slug);
  }
  if (vertical === "economics") {
    return /\b(fed|gdp|inflation|cpi|unemployment|recession|macro|central bank|interest rate|fomc|economy|deficit|treasury)\b/.test(
      s,
    );
  }
  if (vertical === "financials") {
    return /\b(stock|nasdaq|sp500|s&p|earnings|merger|bank|bond|ipo|sec|etf|nyse|dow)\b/.test(s);
  }
  if (vertical === "tech_science") {
    return /\b(ai|tech|science|chip|spacex|nasa|quantum|software|hardware|robot|llm|neural|openai)\b/.test(s);
  }
  if (vertical === "climate") {
    return /\b(climate|carbon|environment|green|renewable|warming|emission|solar|cop\d)\b/.test(s);
  }
  return true;
}

export function sumClaimProfits(claims: ClaimRow[]): bigint {
  let t = 0n;
  for (const c of claims) {
    const n = parseStakeRaw(c.eventPayload?.amount);
    if (n !== undefined) t += n;
  }
  return t;
}

/** Sum best-effort `amount` fields from indexer payloads (volume proxy). */
export function sumEventVolume(events: UserChainEventRow[]): bigint {
  let t = 0n;
  for (const e of events) {
    const p = e.payload;
    if (!p || typeof p !== "object") continue;
    const rec = p as Record<string, unknown>;
    const cand = rec.amount ?? rec.stakeAmount ?? rec.totalAmount ?? rec.value;
    const n = parseStakeRaw(cand);
    if (n !== undefined) t += n;
  }
  return t;
}

export type CategorySlice = { id: PortfolioCategoryId; label: string; value: number; color: string };

export const PORTFOLIO_CATEGORY_LEGEND: { id: PortfolioCategoryId; label: string; color: string }[] = CATEGORY_ORDER.map(
  (id) => ({
    id,
    label: CATEGORY_LABEL[id],
    color: CATEGORY_COLOR[id],
  }),
);

export function buildCategorySlices(
  positions: Record<string, unknown>[],
  marketsByTemplate: Map<string, MarketRow>,
): CategorySlice[] {
  const totals: Record<PortfolioCategoryId, bigint> = {
    crypto: 0n,
    economics: 0n,
    financials: 0n,
    tech_science: 0n,
    climate: 0n,
    other: 0n,
  };

  for (const p of positions) {
    if ("error" in p) continue;
    const tid = typeof p.templateId === "string" ? p.templateId : "";
    const stake = sumNumericStringKey([p], "totalStake");
    const row = tid ? marketsByTemplate.get(tid.toLowerCase()) : undefined;
    const slug = row?.slug ?? "";
    const cat = inferPortfolioCategory(row, slug);
    totals[cat] += stake;
  }

  const slices: CategorySlice[] = [];
  const scale = 10 ** STAKE_TOKEN_DECIMALS;
  for (const id of CATEGORY_ORDER) {
    const v = totals[id];
    if (v > 0n) {
      const num = Number(v) / scale;
      const value = Number.isFinite(num) ? num : 0;
      slices.push({
        id,
        label: CATEGORY_LABEL[id],
        value,
        color: CATEGORY_COLOR[id],
      });
    }
  }

  return slices;
}
