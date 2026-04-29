import type { ClaimRow, MarketRow, UserChainEventRow } from "@/lib/api/retropickApi";
import { STAKE_TOKEN_DECIMALS } from "@/config/tokens";
import { isDiscoverCryptoRow } from "@/lib/market-data/chainDiscover";
import { parseStakeRaw, sumNumericStringKey } from "@/features/portfolio/formatStakeUsd";

export type PortfolioCategoryId = "crypto" | "politics" | "sports" | "business" | "entertainment" | "other";

const CATEGORY_ORDER: PortfolioCategoryId[] = [
  "sports",
  "crypto",
  "politics",
  "business",
  "entertainment",
  "other",
];

const CATEGORY_LABEL: Record<PortfolioCategoryId, string> = {
  sports: "Sports",
  crypto: "Crypto",
  politics: "Politics",
  business: "Business",
  entertainment: "Entertainment",
  other: "Other",
};

/** Approximate palette aligned with dashboard mock (distinct slices). */
export const CATEGORY_COLOR: Record<PortfolioCategoryId, string> = {
  sports: "hsl(16 78% 56%)",
  crypto: "hsl(215 90% 58%)",
  politics: "hsl(292 48% 52%)",
  business: "hsl(199 65% 50%)",
  entertainment: "hsl(142 70% 48%)",
  other: "hsl(228 10% 45%)",
};

function slugKeywordBucket(slug: string): PortfolioCategoryId | null {
  const s = slug.toLowerCase();
  if (/\b(nfl|nba|mlb|soccer|football|olymp|tennis|ufc|sport)\b/.test(s)) return "sports";
  if (/\b(election|trump|biden|congress|senate|govern|politic|vote|policy|geopol)\b/.test(s))
    return "politics";
  if (/\b(earn|revenue|stock|nasdaq|company|corp|ceo|merger|business|fed\s|rate\s hike)\b/.test(s))
    return "business";
  if (/\b(movie|music|oscar|celebr|entertain|hollywood|grammy)\b/.test(s)) return "entertainment";
  return null;
}

export function inferPortfolioCategory(row: MarketRow | undefined, slugFallback: string): PortfolioCategoryId {
  if (row && isDiscoverCryptoRow(row)) return "crypto";
  const kw = slugKeywordBucket(slugFallback);
  if (kw && kw !== "crypto") return kw;
  if (row) return "other";
  return slugKeywordBucket(slugFallback) ?? "other";
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
    politics: 0n,
    sports: 0n,
    business: 0n,
    entertainment: 0n,
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
