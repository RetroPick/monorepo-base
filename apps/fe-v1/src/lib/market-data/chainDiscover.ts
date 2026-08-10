/**
 * Map indexed `MarketRow` (Go API) to `Market` card models for Discover.
 * Uses live outcome views when the API hydrates them; falls back to neutral splits for older payloads.
 * `marketType` uint order matches `MarketTypes.MarketType` in `package/contract/src/types/MarketTypes.sol`.
 */

import type { Market, MarketOutcome } from "@/types/market";
import type { MarketRow } from "@/lib/api/retropickApi";
import type { DiscoveryVerticalId } from "@/lib/discovery-verticals";
import { formatUsdc } from "@/config/tokens";
import { binaryPresentationForMarketType } from "./discoverMarketClassification";

const MARKET_TYPE_NAMES = [
  "Direction",
  "Threshold",
  "RangeClose",
  "Velocity",
  "Ladder",
  "Convergence",
  "Composite",
  "Corridor",
  "Cascade",
] as const;

export function marketTypeName(index: number): string {
  if (index >= 0 && index < MARKET_TYPE_NAMES.length) {
    return MARKET_TYPE_NAMES[index];
  }
  return `MarketType ${index}`;
}

function slugToTitle(slug: string): string {
  const t = slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
  return t || "Market";
}

function pickIconForSlug(slug: string): string {
  const s = slug.toLowerCase();
  if (s.includes("btc") || s.includes("bitcoin")) return "currency_bitcoin";
  if (s.includes("eth") || s.includes("ethereum")) return "currency_exchange";
  if (s.includes("sol") || s.includes("solana")) return "blur_on";
  if (s.includes("chainlink") || /(^|[-/])link($|[-/])/.test(s)) return "link";
  return "show_chart";
}

function parseRawAmount(raw?: string | null): bigint | null {
  if (!raw) return null;
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

function formatStakeAmount(raw: bigint): string {
  const decimals = raw >= 10n ** 18n ? 2 : 4;
  return formatUsdc(raw, decimals);
}

/** Non-zero parsed amounts only; zero pool / volume → undefined so cards show "-". */
function volumeFieldToDisplay(raw: string | null | undefined): string | undefined {
  if (raw == null || raw === "") return undefined;
  const parsed = parseRawAmount(raw);
  if (parsed == null) return raw;
  if (parsed === 0n) return undefined;
  return formatStakeAmount(parsed);
}

function formatTotalPool(row: MarketRow): string | undefined {
  const rawPool = row.totalPool ?? row.volume;
  if (rawPool) {
    const parsed = parseRawAmount(rawPool);
    if (parsed != null) {
      if (parsed === 0n) return undefined;
      return formatStakeAmount(parsed);
    }
  }
  const views = row.outcomes ?? [];
  if (views.length === 0) {
    return volumeFieldToDisplay(row.volume);
  }
  let total = 0n;
  let sawValue = false;
  for (const view of views) {
    const parsed = parseRawAmount(view.poolSize);
    if (parsed == null) continue;
    total += parsed;
    sawValue = true;
  }
  if (!sawValue) {
    return volumeFieldToDisplay(row.volume);
  }
  if (total === 0n) return undefined;
  return formatStakeAmount(total);
}

function outcomeViewsByIndex(row: MarketRow) {
  return new Map((row.outcomes ?? []).map((view) => [view.outcomeIndex, view] as const));
}

export function chainMarketIsLive(row: MarketRow): boolean {
  return row.initialized && row.activeEpochId != null;
}

/** False for template-only rows (`!initialized`); still in setup, not on Discover. */
export function isMarketPastSetup(row: MarketRow): boolean {
  return row.initialized;
}

function deriveStatus(row: MarketRow): string {
  if (chainMarketIsLive(row)) {
    return "open";
  }
  if (row.initialized) {
    return "paused";
  }
  return "setup";
}

/**
 * Slug-only heuristics (e.g. macro templates without numeric `marketType` in a future API).
 * Prefer `isDiscoverCryptoRow` for the Discover Crypto tab.
 */
export function inferCryptoFromSlug(slug: string): boolean {
  const s = slug.toLowerCase();
  if (
    s.includes("btc") ||
    s.includes("bitcoin") ||
    s.includes("eth") ||
    s.includes("ethereum") ||
    s.includes("sol") ||
    s.includes("solana") ||
    s.includes("chainlink")
  ) {
    return true;
  }
  if (/(^|[-/])link($|[-/])/.test(s)) return true;
  if (s.startsWith("op-") && s.includes("direction")) return true;
  return false;
}

/**
 * `MarketTypes.MarketType` 0/1/2 = Direction, Threshold, RangeClose (price / oracle family on this stack).
 * Includes `op-direction-link` (LINK) and other slugs that do not mention BTC/ETH/SOL literally.
 */
export function isDiscoverCryptoRow(row: MarketRow): boolean {
  const mt = row.marketType;
  if (mt === 0 || mt === 1 || mt === 2) return true;
  return inferCryptoFromSlug(row.slug);
}

/** Maps indexed template metadata to the Discover tab that best fits this market (for header context on detail pages). */
export function discoverVerticalForIndexedSlug(slug: string, marketType: number): DiscoveryVerticalId {
  const row: MarketRow = {
    templateId: "",
    slug,
    marketType,
    outcomeCount: 2,
    initialized: true,
    executionMode: 0,
    rollingPhase: 0,
    rollingHaltReason: 0,
    lastIndexedBlock: 0,
    lastIndexedAt: null,
  };
  if (isDiscoverCryptoRow(row)) {
    return "crypto";
  }
  return "trending";
}

export function inferChainAssetFromSlug(
  slug: string,
): "BTC" | "ETH" | "SOL" | "LINK" | null {
  const s = slug.toLowerCase();
  if (s.includes("btc") || s.includes("bitcoin")) return "BTC";
  if (s.includes("eth") || s.includes("ethereum")) return "ETH";
  if (s.includes("solana") || s.startsWith("sol-") || s.includes("-sol-") || s.endsWith("-sol")) {
    return "SOL";
  }
  if (s.includes("chainlink") || /(^|[-/])link($|[-/])/.test(s)) {
    return "LINK";
  }
  return null;
}

export function sortMarketsByActivity(rows: MarketRow[]): MarketRow[] {
  return [...rows].sort((a, b) => {
    const aLive = chainMarketIsLive(a) ? 1 : 0;
    const bLive = chainMarketIsLive(b) ? 1 : 0;
    if (aLive !== bLive) return bLive - aLive;
    return a.slug.localeCompare(b.slug);
  });
}

export function marketRowToCardMarket(row: MarketRow): Market {
  const mt = row.marketType;
  const typeName = marketTypeName(mt);
  const rawOc = row.outcomeCount > 0 ? row.outcomeCount : 2;
  const oc = Math.min(8, Math.max(2, rawOc));
  const byIndex = outcomeViewsByIndex(row);
  const totalPool = formatTotalPool(row);

  let outcomes: MarketOutcome[];
  let isBinary: boolean;
  let primitive: string | undefined;
  const binaryPresentation = binaryPresentationForMarketType(mt, oc);

  if (oc === 2) {
    isBinary = true;
    if (mt === 0) {
      outcomes = [
        { id: "0", label: "Up", probability: rowOutcomeProbability(byIndex, 0, 50) },
        { id: "1", label: "Down", probability: rowOutcomeProbability(byIndex, 1, 50) },
      ];
    } else {
      outcomes = [
        { id: "0", label: "Yes", probability: rowOutcomeProbability(byIndex, 0, 50) },
        { id: "1", label: "No", probability: rowOutcomeProbability(byIndex, 1, 50) },
      ];
    }
  } else {
    isBinary = false;
    if (mt === 2) {
      primitive = "Range";
    }
    const base = Math.floor(100 / oc);
    const rem = 100 - base * oc;
    outcomes = Array.from({ length: oc }, (_, i) => ({
      id: String(i),
      label: `Outcome ${i + 1}`,
      probability: rowOutcomeProbability(byIndex, i, base + (i < rem ? 1 : 0)),
    }));
  }

  const chainExecutionMode: 0 | 1 | undefined =
    row.executionMode === 0 ? 0 : row.executionMode === 1 ? 1 : undefined;

  return {
    id: row.templateId,
    slug: row.slug,
    title: slugToTitle(row.slug),
    category: "On-chain",
    primitive,
    marketType: typeName,
    chainExecutionMode,
    chainMarketTypeId: mt,
    icon: pickIconForSlug(row.slug),
    iconColor: "text-foreground",
    outcomes,
    volume: totalPool ?? "-",
    totalPool: totalPool ?? "-",
    isBinary,
    binaryPresentation,
    status: deriveStatus(row),
    oracleSource: "MarketEngine (indexed)",
  };
}

function rowOutcomeProbability(
  views: Map<number, NonNullable<MarketRow["outcomes"]>[number]>,
  outcomeIndex: number,
  fallback: number,
): number {
  const view = views.get(outcomeIndex);
  if (!view) return fallback;
  const raw = Number(view.impliedProbabilityE6);
  if (!Number.isFinite(raw)) return fallback;
  return Math.max(0, Math.min(100, raw / 10_000));
}

export function chainDetailPath(templateId: string): string {
  return `/app/market/${encodeURIComponent(templateId)}`;
}
