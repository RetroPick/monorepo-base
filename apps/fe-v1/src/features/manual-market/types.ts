import type { ReactNode } from "react";
import type { Market, MarketOutcome } from "@/types/market";
import type {
  DataFreshness,
  EpochRow,
  MarketDetail as ApiMarketDetail,
  OutcomeView,
  ProbabilityHistoryPoint,
} from "@/lib/api/retropickApi";
import { formatUsdc } from "@/config/tokens";

export type ManualHeaderStat = {
  label: string;
  value: string;
  valueClassName?: string;
};

/** When set, `ManualTradeCard` wires `depositToSide` via `useMarketEngine`. */
export interface ManualMarketTradeContext {
  templateId: `0x${string}`;
  activeEpochId: bigint | null;
  outcomeCount: number;
  rollingPhase: number;
  rollingHaltReason: number;
  marketType?: number;
}

export interface ManualMarketViewModel {
  kind: "discovery" | "chain";
  /** Discovery route id (`/app/market/:id`); used for related-market filtering. */
  discoveryMarketId?: string;
  title: string;
  category?: string;
  description?: string;
  icon?: string;
  iconColor?: string;
  image?: string;
  outcomes: MarketOutcome[];
  volumeLabel: string;
  headerStats: ManualHeaderStat[];
  dataFreshness?: DataFreshness;
  activeEpoch?: ApiMarketDetail["activeEpoch"];
  recentEpochs?: EpochRow[];
  probabilityHistory?: ProbabilityHistoryPoint[];
  /** Extra oracle / resolution copy shown below chart (discovery v1 markets). */
  resolutionExtras?: ReactNode;
  relatedMarkets: Market[];
  tradeContext: ManualMarketTradeContext | null;
}

function normalizeTemplateId(raw: string): `0x${string}` {
  const s = raw.startsWith("0x") ? raw : `0x${raw}`;
  return s as `0x${string}`;
}

/** Prefix headline / stat volume with $ when it is a dollar amount (not em dash, not already prefixed). */
function usdVolumeLabel(label: string): string {
  if (label === "-" || label === "") return label;
  if (label.startsWith("$")) return label;
  return `$${label}`;
}

/** View-model for `/app/market/:id` (Polymarket / discovery data). */
export function manualMarketFromDiscovery(
  market: Market,
  relatedMarkets: Market[],
): ManualMarketViewModel {
  const outcomes =
    market.outcomes.length > 0
      ? market.outcomes
      : [
          { id: "yes", label: "Yes", probability: 50 },
          { id: "no", label: "No", probability: 50 },
        ];

  const yes = outcomes[0];
  const no = outcomes[1];
  const yesProb = yes ? Math.round(yes.probability) : 50;
  const noProb = no ? Math.round(no.probability) : 100 - yesProb;

  return {
    kind: "discovery",
    discoveryMarketId: market.id,
    title: market.title,
    category: market.category,
    description: market.description,
    icon: market.icon,
    iconColor: market.iconColor,
    image: market.image,
    outcomes,
    volumeLabel: usdVolumeLabel(market.volume || "-"),
    headerStats: [
      {
        label: "Price to beat",
        value: yes ? `Up ${yesProb}¢` : "-",
        valueClassName: "text-emerald-600 dark:text-emerald-400",
      },
      { label: "Final price", value: market.expiry ? `Ends ${market.expiry}` : "Waiting …" },
      { label: "Vol", value: usdVolumeLabel(market.volume || "-") },
    ],
    recentEpochs: [],
    relatedMarkets,
    tradeContext: null,
  };
}

/** View-model for indexed on-chain template (`/app/chain-markets/:templateId`). */
export function manualMarketFromChainDetail(
  api: ApiMarketDetail,
  probabilityHistory: ProbabilityHistoryPoint[] = [],
): ManualMarketViewModel {
  const oc = api.outcomeCount > 0 ? api.outcomeCount : 2;
  const outcomeViews = api.outcomes ?? [];
  const outcomes = buildChainOutcomes(api.marketType, oc, outcomeViews);
  const volumeLabel = usdVolumeLabel(formatOutcomePoolVolume(outcomeViews) ?? "-");

  const activeEpochId =
    api.activeEpochId != null && api.activeEpochId >= 0
      ? BigInt(api.activeEpochId)
      : null;

  return {
    kind: "chain",
    discoveryMarketId: undefined,
    title: api.slug.replace(/-/g, " "),
    category: "On-chain",
    description: undefined,
    outcomes,
    volumeLabel,
    headerStats: [
      {
        label: "Rolling phase",
        value: String(api.rollingPhase),
      },
      {
        label: "Halt reason",
        value: String(api.rollingHaltReason),
      },
      {
        label: "Active epoch",
        value: activeEpochId != null ? `#${activeEpochId}` : "-",
      },
    ],
    dataFreshness: api.dataFreshness ?? {
      lastIndexedBlock: api.lastIndexedBlock,
      lastSyncAt: api.lastIndexedAt,
    },
    activeEpoch: api.activeEpoch,
    recentEpochs: [],
    probabilityHistory,
    relatedMarkets: [],
    tradeContext: {
      templateId: normalizeTemplateId(api.templateId),
      activeEpochId,
      outcomeCount: oc,
      rollingPhase: api.rollingPhase,
      rollingHaltReason: api.rollingHaltReason,
      marketType: api.marketType,
    },
  };
}

function formatOutcomePoolVolume(outcomeViews: OutcomeView[]): string | undefined {
  if (outcomeViews.length === 0) return undefined;
  let total = 0n;
  let sawValue = false;
  for (const view of outcomeViews) {
    try {
      total += BigInt(view.poolSize);
      sawValue = true;
    } catch {
      /* ignore malformed pool entries */
    }
  }
  if (!sawValue) return undefined;
  const decimals = total >= 10n ** 18n ? 2 : 4;
  return formatUsdc(total, decimals);
}

function outcomeProbability(view: OutcomeView | undefined, fallback: number) {
  if (!view?.impliedProbabilityE6) return fallback;
  const n = Number(view.impliedProbabilityE6);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, n / 10_000));
}

function binaryLabels(marketType: number): [string, string] {
  if (marketType === 0) return ["Up", "Down"];
  return ["Yes", "No"];
}

function buildChainOutcomes(
  marketType: number,
  outcomeCount: number,
  outcomeViews: OutcomeView[],
): MarketOutcome[] {
  const count = Math.min(Math.max(outcomeCount, 2), 8);
  const fallback = 100 / count;
  if (count === 2) {
    const [a, b] = binaryLabels(marketType);
    return [0, 1].map((i) => ({
      id: String(i),
      label: i === 0 ? a : b,
      probability: outcomeProbability(outcomeViews.find((o) => o.outcomeIndex === i), fallback),
    }));
  }
  return Array.from({ length: count }, (_, i) => ({
    id: String(i),
    label: `Outcome ${i + 1}`,
    probability: outcomeProbability(outcomeViews.find((o) => o.outcomeIndex === i), fallback),
  }));
}
