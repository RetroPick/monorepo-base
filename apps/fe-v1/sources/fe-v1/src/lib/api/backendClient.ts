/**
 * RetroPick Backend API Client
 *
 * Typed client for the RetroPick backend service.
 * Base URL is set via VITE_BACKEND_API_URL (defaults to localhost:8790 for dev).
 *
 * The backend is responsible for:
 *   - Session management (EIP-712 signed orders)
 *   - Epoch state indexing (off-chain cache of on-chain events)
 *   - Trusted Reporter Oracle relaying (§10.7 of market type doc)
 *   - Trade history and user analytics
 *   - Webhook delivery for frontend real-time updates
 */

const BASE_URL =
  import.meta.env.VITE_BACKEND_API_URL?.replace(/\/$/, '') || 'http://localhost:8790'

// ── HTTP helper ───────────────────────────────────────────────────────────────

class ApiError extends Error {
  constructor(
    public status:  number,
    public message: string,
    public body?:   unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(
  method:  'GET' | 'POST' | 'PUT' | 'DELETE',
  path:    string,
  body?:   unknown,
  headers?: Record<string, string>,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15_000),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    let parsed: unknown
    try { parsed = JSON.parse(text) } catch { parsed = text }
    throw new ApiError(res.status, `${method} ${path} → ${res.status}`, parsed)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

const get    = <T>(path: string, headers?: Record<string, string>) =>
  request<T>('GET', path, undefined, headers)
const post   = <T>(path: string, body?: unknown) => request<T>('POST', path, body)
const put    = <T>(path: string, body?: unknown) => request<T>('PUT',  path, body)
const del    = <T>(path: string)                  => request<T>('DELETE', path)

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SessionState {
  sessionId:   string
  userAddress: string
  chainId:     number
  createdAt:   number
  expiresAt:   number
}

export interface EpochSummary {
  templateId:     string
  epochId:        number
  state:          number
  totalPool:      string  // USDC formatted
  outcomePools:   string[]
  openAt:         number
  lockAt:         number
  resolveAt:      number
  winningOutcome?: number
}

export interface UserPosition {
  templateId:   string
  epochId:      number
  outcomeIndex: number
  amount:       string  // USDC formatted
  claimable:    boolean
  claimAmount?: string
}

export interface TradeHistoryEntry {
  txHash:       string
  action:       'deposit' | 'switch' | 'claim'
  templateId:   string
  epochId:      number
  outcomeIndex: number
  amount:       string
  timestamp:    number
  chainId:      number
}

// ── Session endpoints ─────────────────────────────────────────────────────────

export const sessionApi = {
  create: (userAddress: string, chainId: number) =>
    post<SessionState>('/sessions', { userAddress, chainId }),

  get: (sessionId: string) =>
    get<SessionState>(`/sessions/${sessionId}`),

  delete: (sessionId: string) =>
    del<void>(`/sessions/${sessionId}`),
}

// ── Epoch / market data endpoints ─────────────────────────────────────────────

export const epochApi = {
  /** List live epochs across all templates (for market discovery). */
  listLive: () =>
    get<EpochSummary[]>('/epochs/live'),

  /** Get epochs for a specific template. */
  getByTemplate: (templateId: string) =>
    get<EpochSummary[]>(`/epochs/${templateId}`),

  /** Get a single epoch. */
  get: (templateId: string, epochId: number) =>
    get<EpochSummary>(`/epochs/${templateId}/${epochId}`),
}

// ── User position endpoints ───────────────────────────────────────────────────

export const positionApi = {
  /** All open/claimable positions for a user. */
  getPositions: (userAddress: string) =>
    get<UserPosition[]>(`/users/${userAddress}/positions`),

  /** Trade history for a user. */
  getHistory: (userAddress: string, limit = 50, offset = 0) =>
    get<TradeHistoryEntry[]>(
      `/users/${userAddress}/history?limit=${limit}&offset=${offset}`,
    ),
}

// ── Signed order endpoints (relayer) ─────────────────────────────────────────

export interface SignedOrderParams {
  sessionId:    string
  action:       'buy' | 'sell' | 'swap'
  outcomeIndex: number
  delta:        number
  toOutcome?:   number
  userAddress:  string
  signature:    `0x${string}`
}

export const orderApi = {
  submit: (params: SignedOrderParams) =>
    post<{ orderId: string; status: string }>('/orders', params),

  getStatus: (orderId: string) =>
    get<{ orderId: string; status: string; txHash?: string }>(`/orders/${orderId}`),
}

// ── Health check ──────────────────────────────────────────────────────────────

export const healthApi = {
  ping: () => get<{ status: 'ok'; chainId: number; blockNumber: number }>('/health'),
}

export { ApiError }
