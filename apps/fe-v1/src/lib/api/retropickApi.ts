import {
  getApiBaseUrl as getRuntimeApiBaseUrl,
  getApiRetries,
  getApiTimeoutMs,
} from "@/lib/runtimeEnv";

/**
 * RetroPick Go API client: health, markets, config, epochs, user events; extends as backend grows.
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

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const attempts = Math.max(0, API_RETRIES) + 1;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const ctrl = new AbortController();
    const timeout = window.setTimeout(() => ctrl.abort(), API_TIMEOUT_MS);
    try {
      const res = await fetch(`${base}${path}`, {
        method: "POST",
        cache: "no-store",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
  outcomeViewBlock?: number;
  totalPool?: string;
  volume?: string;
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
  totalPool?: string;
  volume?: string;
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
  multiplierBps?: string;
  isWinner?: boolean;
  isActiveQuote?: boolean;
  grossPayoutXe6?: string;
  updatedBlock?: number;
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
  /** True when the epoch had more matching events than maxEvents; replay used full chain state but points omit the earliest events. */
  truncated?: boolean;
  eventCount?: number;
  maxEvents?: number;
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
  /** TokenFaucet.nonces(wallet) for EIP-712 MintRequest */
  nonce?: string;
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

export type FaucetRelayResponse = {
  txHash: string;
};

export type FaucetRelayRequestBody = {
  recipient: string;
  amount: string;
  deadline: number;
  signature: `0x${string}`;
};

/** POST gasless faucet mint via backend relayer (Base Sepolia, `requestWithSig`). */
export async function fetchFaucetRelay(body: FaucetRelayRequestBody): Promise<FaucetRelayResponse> {
  return postJson<FaucetRelayResponse>("/api/v1/user/faucet-relay", body);
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
    totalPool: raw.totalPool,
    volume: raw.volume,
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

export type FetchMarketProbabilityHistoryOpts = {
  /** Server replay cap (default 5000, max 10000). */
  maxEvents?: number;
  /** RFC3339; server filters emitted points after full replay (pools stay correct). */
  minIndexedAt?: string;
  /** @deprecated Prefer maxEvents; mapped to backend limit for older URLs. */
  limit?: number;
};

export async function fetchMarketProbabilityHistory(
  templateId: string,
  epochId?: bigint | number | string | null,
  opts?: FetchMarketProbabilityHistoryOpts | number,
): Promise<ProbabilityHistoryResponse> {
  const o: FetchMarketProbabilityHistoryOpts = typeof opts === "number" ? { limit: opts } : (opts ?? {});
  const id = templateId.startsWith("0x") ? templateId : `0x${templateId}`;
  const params = new URLSearchParams();
  if (epochId != null) params.set("epochId", String(epochId));
  if (o.maxEvents != null) params.set("maxEvents", String(o.maxEvents));
  else if (o.limit != null) params.set("limit", String(o.limit));
  if (o.minIndexedAt) params.set("minIndexedAt", o.minIndexedAt);
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
  tokenMetadata?: { stakeTokenSymbol: string; stakeTokenDecimals: number };
  /** Present when API merges deployment flags into `/api/v1/config/contracts`. */
  faucetRelayEnabled?: boolean;
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

export type PortfolioSummaryPositionRow = {
  templateId?: string;
  epochId?: number;
  error?: string;
  claimed?: boolean;
  costBasisWei?: string;
  markValueWei?: string;
  unrealizedPnlWei?: string;
  pendingClaimWei?: string;
  totalStakeWei?: string;
  positionViewBlock?: number;
};

export type PortfolioSummaryResponse = {
  wallet: string;
  aggregate: {
    unrealizedPnlWei: string;
    realizedPnlClaimsWei: string;
    pendingClaimTotalWei: string;
    totalStakeWei: string;
    referenceNetStakeWei: string;
    pnlModelNote?: string;
  };
  positions: PortfolioSummaryPositionRow[];
  dataFreshness: DataFreshness;
};

export async function fetchPortfolioSummary(walletAddress: string): Promise<PortfolioSummaryResponse> {
  const addr = walletAddress.startsWith("0x") ? walletAddress : `0x${walletAddress}`;
  return getJson<PortfolioSummaryResponse>(`/api/v1/user/portfolio-summary?wallet=${encodeURIComponent(addr)}`);
}

export async function fetchWatchlistNonce(walletAddress: string): Promise<{ wallet: string; nonce: number }> {
  const addr = walletAddress.startsWith("0x") ? walletAddress : `0x${walletAddress}`;
  return getJson<{ wallet: string; nonce: number }>(
    `/api/v1/user/watchlist/nonce?wallet=${encodeURIComponent(addr)}`,
  );
}

export async function fetchUserWatchlist(walletAddress: string): Promise<{ wallet: string; templateIds: string[] }> {
  const addr = walletAddress.startsWith("0x") ? walletAddress : `0x${walletAddress}`;
  return getJson<{ wallet: string; templateIds: string[] }>(
    `/api/v1/user/watchlist?wallet=${encodeURIComponent(addr)}`,
  );
}

export type WatchlistMutateRequest = {
  wallet: string;
  action: "add" | "remove" | "import";
  templateId?: string;
  templateIds?: string[];
};

export async function postWatchlistMutate(body: WatchlistMutateRequest): Promise<{
  ok: boolean;
  wallet: string;
  action: string;
  nextNonce?: number;
  templateId?: string;
  templateIds?: string[];
}> {
  return postJson("/api/v1/user/watchlist", body);
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
