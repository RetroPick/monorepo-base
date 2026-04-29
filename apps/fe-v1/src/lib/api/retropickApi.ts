import {
  getApiBaseUrl as getRuntimeApiBaseUrl,
  getApiRetries,
  getApiTimeoutMs,
} from "@/lib/runtimeEnv";

/**
 * RetroPick Go API client — health, markets, config, epochs, user events; extends as backend grows.
 * Default base: NEXT_PUBLIC_API_URL, VITE_API_URL, or http://127.0.0.1:8080.
 */

const base = getRuntimeApiBaseUrl();
const API_TIMEOUT_MS = getApiTimeoutMs();
const API_RETRIES = getApiRetries();

type ApiErrorKind = "http" | "network" | "timeout";

export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public body?: unknown,
    public kind: ApiErrorKind = "http",
    public path?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function responseMessage(path: string, status: number, body: unknown) {
  if (body && typeof body === "object") {
    const record = body as { message?: unknown; error?: unknown };
    if (typeof record.message === "string") return record.message;
    if (typeof record.error === "string") return record.error;
  }
  if (typeof body === "string" && body.trim()) return body.trim().slice(0, 240);
  return `${path} returned ${status}`;
}

export function isTransientApiError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.kind !== "http" || [408, 429, 500, 502, 503, 504].includes(error.status);
  }
  return error instanceof TypeError || isAbortError(error);
}

export function apiErrorSummary(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.kind === "timeout") return `${base}${error.path ?? ""} timed out`;
    if (error.kind === "network") return `${base} is not reachable`;
    return `${base}${error.path ?? ""} (${error.status}: ${error.message})`;
  }
  if (error instanceof TypeError) return `${base} is not reachable`;
  if (isAbortError(error)) return `${base} timed out`;
  return base;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getJson<T>(path: string): Promise<T> {
  const attempts = Math.max(0, API_RETRIES) + 1;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const ctrl = new AbortController();
    const timeout = window.setTimeout(() => ctrl.abort(), API_TIMEOUT_MS);
    try {
      const res = await fetch(`${base}${path}`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: ctrl.signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        let parsed: unknown = text;
        try {
          parsed = JSON.parse(text);
        } catch {
          /* keep text */
        }
        throw new ApiError(res.status, responseMessage(path, res.status, parsed), parsed, "http", path);
      }
      return res.json() as Promise<T>;
    } catch (error) {
      const apiError =
        error instanceof ApiError
          ? error
          : new ApiError(
              0,
              isAbortError(error) ? `${path} timed out` : `${path} network error`,
              undefined,
              isAbortError(error) ? "timeout" : "network",
              path,
            );
      if (attempt + 1 >= attempts || !isTransientApiError(apiError)) throw apiError;
      await delay(250 * 2 ** attempt);
    } finally {
      window.clearTimeout(timeout);
    }
  }
  throw new ApiError(0, `${path} failed`, undefined, "network", path);
}

export type HealthResponse = {
  ok: boolean;
  lastIndexedBlock: number;
  lastBlockHash?: string | null;
  lastSyncAt?: string | null;
};

export async function fetchHealth(): Promise<HealthResponse> {
  return getJson<HealthResponse>("/api/v1/health");
}

export type MarketRow = {
  templateId: string;
  slug: string;
  marketType: number;
  outcomeCount: number;
  initialized: boolean;
  published?: boolean;
  executionMode: number;
  rollingPhase: number;
  rollingHaltReason: number;
  lastIndexedBlock: number;
  lastIndexedAt: string | null;
  activeEpochId?: number;
  lastResolvedEpochId?: number;
  rollingNextEpochId?: number;
  haltedAtEpochId?: number;
  outcomes?: OutcomeView[];
};

export async function fetchMarkets(): Promise<MarketRow[]> {
  const data = await getJson<{ markets: MarketRow[] }>("/api/v1/markets");
  return data.markets;
}

export type DataFreshness = {
  lastSyncAt?: string | null;
  lastIndexedBlock: number;
};

export type MarketDetail = {
  templateId: string;
  slug: string;
  marketType: number;
  outcomeCount: number;
  initialized: boolean;
  executionMode: number;
  rollingPhase: number;
  rollingHaltReason: number;
  lastIndexedBlock: number;
  lastIndexedAt: string | null;
  activeEpochId?: number;
  lastResolvedEpochId?: number;
  activeEpoch?: {
    epochId: number;
    status: string;
    claimable: boolean;
    refMode: boolean;
    openAt?: string;
    lockAt?: string;
    resolveAt?: string;
    winningOutcomeMask?: number;
  };
  outcomes?: OutcomeView[];
  outcomeViewBlock?: number;
  outcomesError?: string;
  dataFreshness?: DataFreshness;
};

export type OutcomeView = {
  outcomeIndex: number;
  poolSize: string;
  impliedProbabilityE6: string;
  displayPercentE4?: string;
  isWinner?: boolean;
  isActiveQuote?: boolean;
  grossPayoutXe6?: string;
};

export type ProbabilityHistoryOutcome = {
  outcomeIndex: number;
  poolSize: string;
  impliedProbabilityE6: string;
};

export type ProbabilityHistoryPoint = {
  blockNumber: number;
  txHash: string;
  logIndex: number;
  eventName: string;
  indexedAt?: string | null;
  totalPool: string;
  outcomes: ProbabilityHistoryOutcome[];
};

export type ProbabilityHistoryResponse = {
  templateId: string;
  epochId: number;
  outcomeCount: number;
  points: ProbabilityHistoryPoint[];
  source: string;
};

/** Shapes planned in `.dev/frontend/user/README.md` (implement when backend exposes routes). */
export type UserPositionRow = {
  templateId: string;
  epochId: number;
  outcomeIndex: number;
  amount: string;
  claimable: boolean;
};

export type PositionViewRow = {
  templateId: string;
  epochId: number;
  wallet?: string;
  source?: string;
  positionViewBlock?: number;
  initialized?: boolean;
  claimed?: boolean;
  claimableNow?: boolean;
  status?: number;
  stakes?: string[];
  totalStake?: string;
  entryFeesPaid?: string;
  switchFeesPaid?: string;
  claimedAmount?: string;
  pendingClaimAmount?: string;
  pendingRefundAmount?: string;
  winningStake?: string;
  settledClaimRoutingEnabled?: boolean;
  error?: string;
  [k: string]: unknown;
};

export type UserClaimRow = {
  templateId: string;
  epochId: number;
  amount: string;
};

export type UserPositionsResponse = {
  wallet: string;
  positions: PositionViewRow[];
  dataFreshness: DataFreshness;
};

export async function fetchUserPositions(
  walletAddress: string,
  context?: { templateId?: string; epochId?: bigint | number | string | null },
): Promise<UserPositionsResponse> {
  const addr = walletAddress.startsWith("0x")
    ? walletAddress
    : `0x${walletAddress}`;
  const params = new URLSearchParams({ wallet: addr });
  if (context?.templateId && context.epochId != null) {
    params.set("templateId", context.templateId);
    params.set("epochId", String(context.epochId));
  }
  return getJson<UserPositionsResponse>(
    `/api/v1/user/positions?${params.toString()}`,
  );
}

export type ClaimRow = {
  id: number;
  templateId: string;
  epochId: number;
  txHash: string;
  blockNumber: number;
  indexedAt?: string;
  eventPayload?: { amount?: string; [k: string]: unknown };
  epochClaimable?: boolean;
  refMode?: boolean;
};

export type UserClaimsResponse = {
  wallet: string;
  claims: ClaimRow[];
  dataFreshness: DataFreshness;
};

export async function fetchUserClaims(
  walletAddress: string,
  limit = 100,
): Promise<UserClaimsResponse> {
  const addr = walletAddress.startsWith("0x")
    ? walletAddress
    : `0x${walletAddress}`;
  const q = limit !== 100 ? `&limit=${limit}` : "";
  return getJson<UserClaimsResponse>(
    `/api/v1/user/claims?wallet=${encodeURIComponent(addr)}${q}`,
  );
}

export type FaucetStateResponse = {
  source: string;
  chainId: number;
  stakeToken: string;
  tokenFaucet: string;
  cooldownSeconds?: number;
  maxMintAmount?: string;
  lastMintAt?: number;
  stakeTokenBalance?: string;
  stakeTokenDecimals?: number;
  note?: string;
};

export async function fetchFaucetState(
  walletAddress: string,
): Promise<FaucetStateResponse> {
  const addr = walletAddress.startsWith("0x")
    ? walletAddress
    : `0x${walletAddress}`;
  return getJson<FaucetStateResponse>(
    `/api/v1/user/faucet-state?wallet=${encodeURIComponent(addr)}`,
  );
}

export async function fetchMarket(templateId: string): Promise<MarketDetail> {
  const id = templateId.startsWith("0x") ? templateId.slice(2) : templateId;
  const raw = await getJson<Partial<MarketDetail> & Pick<MarketDetail, "templateId" | "slug">>(
    `/api/v1/markets/0x${id}`,
  );
  return {
    templateId: raw.templateId,
    slug: raw.slug,
    marketType: typeof raw.marketType === "number" ? raw.marketType : 0,
    outcomeCount: typeof raw.outcomeCount === "number" ? raw.outcomeCount : 2,
    initialized: Boolean(raw.initialized),
    executionMode: typeof raw.executionMode === "number" ? raw.executionMode : 0,
    rollingPhase: typeof raw.rollingPhase === "number" ? raw.rollingPhase : 0,
    rollingHaltReason: typeof raw.rollingHaltReason === "number" ? raw.rollingHaltReason : 0,
    lastIndexedBlock: typeof raw.lastIndexedBlock === "number" ? raw.lastIndexedBlock : 0,
    lastIndexedAt: raw.lastIndexedAt ?? null,
    activeEpochId: raw.activeEpochId,
    lastResolvedEpochId: raw.lastResolvedEpochId,
    activeEpoch: raw.activeEpoch,
    outcomes: raw.outcomes,
    outcomeViewBlock: raw.outcomeViewBlock,
    outcomesError: raw.outcomesError,
    dataFreshness: raw.dataFreshness,
  };
}

export async function fetchMarketOutcomes(
  templateId: string,
  epochId: bigint | number | string,
): Promise<OutcomeView[]> {
  const id = templateId.startsWith("0x") ? templateId : `0x${templateId}`;
  const data = await getJson<{ outcomes: OutcomeView[] }>(
    `/api/v1/markets/${encodeURIComponent(id)}/epochs/${String(epochId)}/outcomes`,
  );
  return data.outcomes;
}

export async function fetchMarketProbabilityHistory(
  templateId: string,
  epochId?: bigint | number | string | null,
  limit = 200,
): Promise<ProbabilityHistoryResponse> {
  const id = templateId.startsWith("0x") ? templateId : `0x${templateId}`;
  const params = new URLSearchParams();
  if (epochId != null) params.set("epochId", String(epochId));
  if (limit !== 200) params.set("limit", String(limit));
  const q = params.toString();
  return getJson<ProbabilityHistoryResponse>(
    `/api/v1/markets/${encodeURIComponent(id)}/probability-history${q ? `?${q}` : ""}`,
  );
}

export type RegistryContractsResponse = {
  environment: string;
  chainId: number;
  explorers: { basescan: string; blockscout: string };
  contracts: Record<string, string>;
  abiFiles: Record<string, string>;
};

export async function fetchRegistryContracts(): Promise<RegistryContractsResponse> {
  return getJson<RegistryContractsResponse>("/api/v1/config/contracts");
}

export type EpochRow = {
  templateId: string;
  epochId: number;
  status: string;
  claimable: boolean;
  refMode: boolean;
  openAt?: string;
  lockAt?: string;
  resolveAt?: string;
  winningOutcomeMask?: number;
  updatedAt?: string | null;
};

export async function fetchEpochsForMarket(
  templateId: string,
  limit = 100,
): Promise<EpochRow[]> {
  const id = templateId.startsWith("0x") ? templateId : `0x${templateId}`;
  const q = limit !== 100 ? `?limit=${limit}` : "";
  const data = await getJson<{ epochs: EpochRow[] }>(
    `/api/v1/markets/${encodeURIComponent(id)}/epochs${q}`,
  );
  return data.epochs;
}

export type UserChainEventRow = {
  id: number;
  blockNumber: number;
  txHash: string;
  logIndex: number;
  contractAddr: string;
  eventName: string;
  templateId?: string;
  epochId?: number;
  userAddress?: string;
  indexedAt?: string | null;
  /** Decoded indexer payload (amounts, indices, etc.). */
  payload?: unknown;
};

export async function fetchUserEvents(
  walletAddress: string,
  limit = 100,
): Promise<UserChainEventRow[]> {
  const addr = walletAddress.startsWith("0x")
    ? walletAddress
    : `0x${walletAddress}`;
  const q = limit !== 100 ? `?limit=${limit}` : "";
  const data = await getJson<{ events: UserChainEventRow[] }>(
    `/api/v1/user/${encodeURIComponent(addr)}/events${q}`,
  );
  return data.events;
}

export function getApiBaseUrl(): string {
  return base;
}

export function getApiWebSocketUrl(): string {
  try {
    const u = new URL(base);
    u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
    u.pathname = "/ws";
    u.search = "";
    return u.toString();
  } catch {
    return "ws://127.0.0.1:8080/ws";
  }
}
