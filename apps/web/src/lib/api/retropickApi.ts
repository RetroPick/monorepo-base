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
    if (record.error && typeof record.error === "object") {
      const nested = record.error as { message?: unknown; code?: unknown };
      if (typeof nested.message === "string" && nested.message.trim()) return nested.message;
      if (typeof nested.code === "string" && nested.code.trim()) return nested.code;
    }
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

function buildHeaders() {
  const headers: Record<string, string> = { Accept: "application/json" };
  const csrf = getCsrfToken();
  if (csrf) headers["X-CSRF-Token"] = csrf;
  return headers;
}

function getCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)rp_csrf=([^;]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

async function getJson<T>(path: string): Promise<T> {
  const attempts = Math.max(0, API_RETRIES) + 1;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const ctrl = new AbortController();
    const timeout = window.setTimeout(() => ctrl.abort(), API_TIMEOUT_MS);
    try {
      const res = await fetch(`${base}${path}`, {
        cache: "no-store",
        headers: buildHeaders(),
        credentials: "include",
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
      const headers = buildHeaders();
      headers["Content-Type"] = "application/json";
      const res = await fetch(`${base}${path}`, {
        method: "POST",
        cache: "no-store",
        headers,
        body: JSON.stringify(body),
        credentials: "include",
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
  /** Present on API ≥ retropick.health.v1 — use for automation probes. */
  schemaVersion?: string;
  environment?: string;
  chainId?: number;
  lastIndexedBlock: number;
  indexedBlock?: number;
  lastBlockHash?: string | null;
  lastSyncAt?: string | null;
  indexer?: {
    lastIndexedBlock: number;
    lastBlockHash?: string | null;
    lastSyncAt?: string | null;
    reorgDepth: number;
  };
  contracts?: { marketEngineProxy?: string };
};

export async function fetchHealth(): Promise<HealthResponse> {
  return getJson<HealthResponse>("/api/v1/health");
}

export type AuthNonceResponse = {
  wallet: `0x${string}`;
  message: string;
  challenge: string;
  expiresIn: number;
};

export type AuthSessionResponse = {
  authenticated: boolean;
  wallet: `0x${string}`;
  expiresAt?: string;
};

export async function createAuthNonce(wallet: `0x${string}`): Promise<AuthNonceResponse> {
  return postJson<AuthNonceResponse>("/api/v1/auth/nonce", { wallet });
}

export async function verifyAuthSession(body: {
  wallet: `0x${string}`;
  message: string;
  signature: `0x${string}`;
  challenge: string;
}): Promise<AuthSessionResponse> {
  return postJson<AuthSessionResponse>("/api/v1/auth/verify", body);
}

export async function fetchAuthSession(): Promise<AuthSessionResponse> {
  return getJson<AuthSessionResponse>("/api/v1/auth/session");
}

export async function logoutAuthSession(): Promise<{ ok: boolean }> {
  return postJson<{ ok: boolean }>("/api/v1/auth/logout", {});
}

export type MarketRow = {
  templateId: string;
  slug: string;
  title?: string;
  subtitle?: string;
  resolutionRule?: string;
  feedLabel?: string;
  vertical?: string;
  displayOrder?: number;
  outcomeLabels?: string[];
  primaryFeedId?: string;
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
  /**
   * Indexer projection lifecycle for the active epoch (`market_snapshots.status`),
   * same source as wire `status` when the snapshot row exists. Values: `open`, `locked`, `resolved`.
   */
  epochStatus?: string;
};

export async function fetchMarkets(): Promise<MarketRow[]> {
  const data = await getJson<{ markets: Array<MarketRow & { status?: string }> }>("/api/v1/legacy/markets");
  return data.markets.map(({ status, ...row }) => ({
    ...row,
    epochStatus: row.epochStatus ?? (typeof status === "string" ? status : undefined),
  }));
}

export type DataFreshness = {
  lastSyncAt?: string | null;
  lastIndexedBlock: number;
};

export type MarketDetail = {
  templateId: string;
  slug: string;
  title?: string;
  subtitle?: string;
  resolutionRule?: string;
  feedLabel?: string;
  vertical?: string;
  displayOrder?: number;
  outcomeLabels?: string[];
  primaryFeedId?: string;
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
  /** Same projection field as list `epochStatus` when `market_snapshots` is merged. */
  epochStatus?: string;
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
  label?: string;
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

export type UserBalanceResponse = {
  wallet: string;
  usdcAvailable: string;
  usdcLocked: string;
  updatedAt: string;
};

export async function fetchUserBalance(walletAddress: string): Promise<UserBalanceResponse> {
  void walletAddress;
  return getJson<UserBalanceResponse>("/api/v1/me/balance");
}

export async function fetchUserPositions(
  walletAddress: string,
  context?: { templateId?: string; epochId?: bigint | number | string | null },
): Promise<UserPositionsResponse> {
  void walletAddress;
  const params = new URLSearchParams();
  if (context?.templateId && context.epochId != null) {
    params.set("templateId", context.templateId);
    params.set("epochId", String(context.epochId));
  }
  return getJson<UserPositionsResponse>(
    `/api/v1/me/positions${params.size > 0 ? `?${params.toString()}` : ""}`,
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
  void walletAddress;
  const q = limit !== 100 ? `?limit=${limit}` : "";
  return getJson<UserClaimsResponse>(`/api/v1/me/claims${q}`);
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
  const raw = await getJson<Partial<MarketDetail> & Pick<MarketDetail, "templateId" | "slug"> & { status?: string }>(
    `/api/v1/legacy/markets/0x${id}`,
  );
  return {
    templateId: raw.templateId,
    slug: raw.slug,
    title: raw.title,
    subtitle: raw.subtitle,
    resolutionRule: raw.resolutionRule,
    feedLabel: raw.feedLabel,
    vertical: raw.vertical,
    displayOrder: raw.displayOrder,
    outcomeLabels: raw.outcomeLabels,
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
    epochStatus:
      typeof raw.epochStatus === "string"
        ? raw.epochStatus
        : typeof raw.status === "string"
          ? raw.status
          : raw.activeEpoch?.status,
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
    `/api/v1/legacy/markets/${encodeURIComponent(id)}/epochs/${String(epochId)}/outcomes`,
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
    `/api/v1/legacy/markets/${encodeURIComponent(id)}/probability-history${q ? `?${q}` : ""}`,
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
    `/api/v1/legacy/markets/${encodeURIComponent(id)}/epochs${q}`,
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
  void walletAddress;
  const q = limit !== 100 ? `?limit=${limit}` : "";
  const data = await getJson<{ events: UserChainEventRow[] }>(
    `/api/v1/me/events${q}`,
  );
  return data.events;
}

export type ChartCandle = {
  feedId: string;
  intervalSec: number;
  bucketStart: string;
  openE8: string;
  highE8: string;
  lowE8: string;
  closeE8: string;
  source: string;
  sampleCount: number;
  updatedAt: string;
};

export async function fetchMarketChart(
  templateId: string,
  opts?: { feedId?: string; interval?: number; limit?: number },
): Promise<{ feedId: string; intervalSec: number; candles: ChartCandle[] }> {
  const id = templateId.startsWith("0x") ? templateId : `0x${templateId}`;
  const params = new URLSearchParams();
  if (opts?.feedId) params.set("feedId", opts.feedId);
  if (opts?.interval != null) params.set("interval", String(opts.interval));
  if (opts?.limit != null) params.set("limit", String(opts.limit));
  const q = params.toString();
  return getJson(`/api/v1/legacy/markets/${encodeURIComponent(id)}/chart${q ? `?${q}` : ""}`);
}

export type TxPrepareRequest =
  | {
      wallet?: string;
      templateId: string;
      epochId: number | string | bigint;
      amount: string;
      outcomeIndex: number;
      idempotencyKey?: string;
    }
  | {
      wallet?: string;
      templateId: string;
      epochId: number | string | bigint;
      amount: string;
      fromOutcomeIndex: number;
      toOutcomeIndex: number;
      idempotencyKey?: string;
    }
  | {
      wallet?: string;
      templateId: string;
      epochId?: number | string | bigint;
      epochIds?: Array<number | string | bigint>;
      idempotencyKey?: string;
    };

export type TxPreparedResponse = {
  action: string;
  chainId: number;
  to: string;
  value: string;
  data: string;
  method: string;
  expiresAt: string;
  idempotencyKey: string;
};

export async function prepareEnterTx(body: TxPrepareRequest): Promise<TxPreparedResponse> {
  return postJson("/api/v1/tx/prepare/enter", body);
}

export async function prepareSwitchTx(body: TxPrepareRequest): Promise<TxPreparedResponse> {
  return postJson("/api/v1/tx/prepare/switch", body);
}

export async function prepareClaimTx(body: TxPrepareRequest): Promise<TxPreparedResponse> {
  return postJson("/api/v1/tx/prepare/claim", body);
}

export async function submitPreparedTx(body: {
  wallet: string;
  txHash: string;
  action: string;
  templateId?: string;
  epochId?: number | string | bigint;
  idempotencyKey?: string;
}): Promise<{ ok: boolean; txHash: string }> {
  return postJson("/api/v1/tx/submit", body);
}

export type FundingIntent = {
  id: string;
  wallet: string;
  status: string;
  targetCurrency: string;
  targetAmountDecimal: string;
  targetUsdcAmount: string;
  settlementChainId: number;
  settlementToken: string;
  recommendedRouteId?: string | null;
  selectedRouteId?: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  failureCode?: string | null;
  failureMessage?: string | null;
};

export type FundingConfigResponse = {
  settlement: {
    chainId: number;
    token: { symbol: string; address: string; decimals: number };
    receiver: string;
  };
  limits: {
    minDepositUsdc: string;
    softMaxDepositUsdc: string;
    hardMaxDepositUsdc: string;
  };
  supportedSourceChains: number[];
  supportedSourceTokens: Record<string, string[]>;
  providers?: string[];
};

export type FundingRouteOption = {
  id: string;
  provider: string;
  providerRouteId: string;
  sourceChainId: number;
  sourceTokenAddress: string;
  sourceTokenSymbol?: string | null;
  sourceTokenDecimals?: number | null;
  sourceAmount: string;
  estimatedUsdcReceived: string;
  minUsdcReceived: string;
  estimatedDurationSeconds?: number | null;
  routeScore?: string;
  status: string;
  createdAt: string;
};

export async function createFundingIntent(body: {
  wallet: string;
  targetAmountDecimal: string;
  targetUsdcAmount: string;
}): Promise<FundingIntent> {
  return postJson("/api/v1/funding/intents", body);
}

export async function fetchFundingConfig(): Promise<FundingConfigResponse> {
  return getJson("/api/funding/config");
}

export async function createFundingIntentV2(body: {
  userAddress: string;
  targetCurrency: "USD";
  targetAmount: string;
  clientNonce: string;
  mode?: "AUTO_BEST_SOURCE";
}): Promise<{
  intentId: string;
  status: string;
  target: { currency: "USDC"; amount: string; displayAmount: string };
}> {
  return postJson("/api/funding/intents", body);
}

export async function scanFundingIntentBalances(intentId: string): Promise<{ status: string }> {
  return postJson(`/api/funding/intents/${encodeURIComponent(intentId)}/scan-balances`, {});
}

export async function fetchFundingOptionsV2(intentId: string): Promise<{
  intentId: string;
  status: string;
  recommendedOptionId?: string;
  options: Array<{
    optionId: string;
    provider: string;
    source: {
      chainId: number;
      tokenAddress: string;
      tokenSymbol?: string;
      requiredAmount: string;
    };
    destination: {
      estimatedToAmount: string;
      minToAmount: string;
    };
  }>;
}> {
  return getJson(`/api/funding/intents/${encodeURIComponent(intentId)}/options`);
}

export async function selectFundingOption(
  intentId: string,
  body: { optionId: string },
): Promise<{
  intentId: string;
  status: string;
  execution: { executionId: string; provider: string; serializedRoute?: unknown; routeVersion?: string };
}> {
  return postJson(`/api/funding/intents/${encodeURIComponent(intentId)}/select-option`, body);
}

export async function fetchFundingExecution(executionId: string): Promise<{
  executionId: string;
  status: string;
  provider: string;
  sourceChainId: number;
  sourceToken: string;
  sourceAmount: string;
  destinationChainId: number;
  destinationToken: string;
  expectedUsdcAmount: string;
  minUsdcAmount: string;
  sourceTxHash?: string;
  destinationTxHash?: string;
  serializedRoute?: unknown;
  routeVersion?: string;
  updatedAt: string;
}> {
  return getJson(`/api/funding/executions/${encodeURIComponent(executionId)}`);
}

export async function markFundingExecutionStartedV2(
  executionId: string,
  body: { walletAddress: string; clientRouteExecutionId: string; idempotencyKey: string },
): Promise<{ status: string }> {
  return postJson(`/api/funding/executions/${encodeURIComponent(executionId)}/start`, body);
}

export async function markFundingRouteUpdateV2(executionId: string, body: unknown): Promise<{ status: string }> {
  return postJson(`/api/funding/executions/${encodeURIComponent(executionId)}/route-update`, body);
}

export async function markFundingSourceTxV2(
  executionId: string,
  body: { chainId: number; txHash: string; idempotencyKey: string },
): Promise<{ status: string }> {
  return postJson(`/api/funding/executions/${encodeURIComponent(executionId)}/source-tx`, body);
}

export async function fetchFundingIntent(intentId: string): Promise<FundingIntent> {
  return getJson(`/api/v1/funding/intents/${encodeURIComponent(intentId)}`);
}

export async function fetchFundingOptions(intentId: string, refresh = false): Promise<{ options: FundingRouteOption[] }> {
  const q = refresh ? "?refresh=1" : "";
  return getJson(`/api/v1/funding/intents/${encodeURIComponent(intentId)}/options${q}`);
}

export async function selectFundingRoute(
  intentId: string,
  body: { wallet: string; routeId: string },
): Promise<FundingIntent> {
  return postJson(`/api/v1/funding/intents/${encodeURIComponent(intentId)}/select-route`, body);
}

export async function markFundingExecutionStarted(
  intentId: string,
  body: { wallet: string; idempotencyKey: string; txHash?: string },
): Promise<FundingIntent> {
  return postJson(`/api/v1/funding/intents/${encodeURIComponent(intentId)}/execution-started`, body);
}

export async function markFundingSourceTx(
  intentId: string,
  body: { wallet: string; idempotencyKey: string; txHash: string },
): Promise<FundingIntent> {
  return postJson(`/api/v1/funding/intents/${encodeURIComponent(intentId)}/source-tx`, body);
}

export async function markFundingRouteUpdate(
  intentId: string,
  body: { wallet: string; idempotencyKey: string; txHash?: string },
): Promise<FundingIntent> {
  return postJson(`/api/v1/funding/intents/${encodeURIComponent(intentId)}/route-update`, body);
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
  void walletAddress;
  return getJson<PortfolioSummaryResponse>("/api/v1/me/portfolio-summary");
}

export async function fetchWatchlistNonce(walletAddress: string): Promise<{ wallet: string; nonce: number }> {
  const addr = walletAddress.startsWith("0x") ? walletAddress : `0x${walletAddress}`;
  return getJson<{ wallet: string; nonce: number }>(
    `/api/v1/user/watchlist/nonce?wallet=${encodeURIComponent(addr)}`,
  );
}

export async function fetchUserWatchlist(walletAddress: string): Promise<{ wallet: string; templateIds: string[] }> {
  void walletAddress;
  return getJson<{ wallet: string; templateIds: string[] }>("/api/v1/me/watchlist");
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
  const path = body.action === "import" ? "/api/v1/user/watchlist" : "/api/v1/me/watchlist";
  return postJson(path, body);
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
