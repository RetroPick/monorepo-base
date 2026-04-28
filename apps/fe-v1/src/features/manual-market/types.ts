import type { ReactNode } from "react";
import type { Market, MarketOutcome } from "@/types/market";
import type {
  DataFreshness,
  EpochRow,
  MarketDetail as ApiMarketDetail,
} from "@/lib/api/retropickApi";

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
  /** Extra oracle / resolution copy shown below chart (discovery v1 markets). */
  resolutionExtras?: ReactNode;
  relatedMarkets: Market[];
  tradeContext: ManualMarketTradeContext | null;
}

function normalizeTemplateId(raw: string): `0x${string}` {
  const s = raw.startsWith("0x") ? raw : `0x${raw}`;
  return s as `0x${string}`;
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
    volumeLabel: market.volume || "—",
    headerStats: [
      {
        label: "Price to beat",
        value: yes ? `Up ${yesProb}¢` : "—",
        valueClassName: "text-emerald-600 dark:text-emerald-400",
      },
      { label: "Final price", value: market.expiry ? `Ends ${market.expiry}` : "Waiting …" },
      { label: "Vol", value: market.volume || "—" },
    ],
    recentEpochs: [],
    relatedMarkets,
    tradeContext: null,
  };
}

/** View-model for indexed on-chain template (`/app/chain-markets/:templateId`). */
export function manualMarketFromChainDetail(
  api: ApiMarketDetail,
  volumeHint?: string,
): ManualMarketViewModel {
  const oc = api.outcomeCount > 0 ? api.outcomeCount : 2;
  const outcomes: MarketOutcome[] =
    oc === 2
      ? [
          { id: "0", label: "Yes", probability: 50 },
          { id: "1", label: "No", probability: 50 },
        ]
      : Array.from({ length: Math.min(oc, 8) }, (_, i) => ({
          id: String(i),
          label: `Outcome ${i + 1}`,
          probability: Math.round(100 / Math.max(oc, 1)),
        }));

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
    volumeLabel: volumeHint ?? "—",
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
        value: activeEpochId != null ? `#${activeEpochId}` : "—",
      },
    ],
    dataFreshness: api.dataFreshness ?? {
      lastIndexedBlock: api.lastIndexedBlock,
      lastSyncAt: api.lastIndexedAt,
    },
    activeEpoch: api.activeEpoch,
    recentEpochs: [],
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
