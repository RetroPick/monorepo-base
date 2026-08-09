/**
 * Derives watchlist table columns from indexer template slugs
 * (e.g. `rolling-threshold-link-usd-4d-v2`, `manual-direction-btc-usd-4d`).
 */
export type WatchlistSlugParts = {
  typeLabel: string;
  marketLabel: string;
  resolutionLabel: string;
  poolLabel: string;
};

function titleCaseWords(parts: string[]): string {
  if (parts.length === 0) return "-";
  return parts.map((p) => (p ? p.charAt(0).toUpperCase() + p.slice(1) : "")).join(" ");
}

/**
 * Parses slug segments from the right: optional `vN` pool, optional `\d+[dwmhy]` resolution,
 * then a `base-quote` pair if the last two tokens look like symbols, remainder = type family.
 */
export function parseWatchlistSlug(slug: string): WatchlistSlugParts {
  const raw = slug.trim().toLowerCase();
  if (!raw) {
    return { typeLabel: "-", marketLabel: "-", resolutionLabel: "-", poolLabel: "-" };
  }
  const parts = raw.split("-").filter(Boolean);
  if (parts.length === 0) {
    return { typeLabel: "-", marketLabel: "-", resolutionLabel: "-", poolLabel: "-" };
  }

  const working = [...parts];
  let poolLabel = "-";
  if (/^v\d+$/i.test(working[working.length - 1] ?? "")) {
    poolLabel = (working.pop() as string).toUpperCase();
  }

  let resolutionLabel = "-";
  if (/^\d+[dwmhy]$/i.test(working[working.length - 1] ?? "")) {
    resolutionLabel = (working.pop() as string).toUpperCase();
  }

  let marketLabel = "-";
  let typeParts = working;
  if (working.length >= 2) {
    const a = working[working.length - 2] as string;
    const b = working[working.length - 1] as string;
    if (/^[a-z0-9]{1,10}$/i.test(a) && /^[a-z0-9]{1,10}$/i.test(b)) {
      marketLabel = `${a}-${b}`.toUpperCase();
      typeParts = working.slice(0, -2);
    }
  }

  let typeLabel = typeParts.length > 0 ? titleCaseWords(typeParts) : "-";
  if (marketLabel === "-" && working.length > 0) {
    marketLabel = slug.trim();
    typeLabel = "-";
  }

  return { typeLabel, marketLabel, resolutionLabel, poolLabel };
}
