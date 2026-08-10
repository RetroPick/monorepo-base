// MARKETS_CUSTODY: BFF trading client — session cookie only, no CLOB secrets in client

import { getMarketsApiOrigin } from "../../wallet/config/runtimeEnv";

import type { UnsignedOrderPayload } from "./computeContentHash";

const MARKETS_API_BASE = "/api/v1/markets";

export type TradingApiErrorCode =
  | "unauthorized"
  | "forbidden"
  | "invalid_request"
  | "not_found"
  | "conflict"
  | "integrity_mismatch"
  | "preview_expired"
  | "unavailable"
  | "upstream_unavailable"
  | "network"
  | "unknown";

export class TradingApiError extends Error {
  readonly code: TradingApiErrorCode;
  readonly status: number;
  readonly requestId?: string;

  constructor(code: TradingApiErrorCode, message: string, status: number, requestId?: string) {
    super(message);
    this.name = "TradingApiError";
    this.code = code;
    this.status = status;
    this.requestId = requestId;
  }
}

type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
    requestId?: string;
  };
};

export type OrderSide = "BUY" | "SELL";

export type OrderPreviewRequest = {
  marketId: string;
  tokenId: string;
  side: OrderSide;
  price: string;
  size: string;
  orderType: "LIMIT";
  timeInForce?: "GTC" | "GTD";
  makerAddress: string;
  idempotencyKey?: string;
};

export type OrderPreviewHumanSummary = {
  action: OrderSide;
  market: string;
  outcome: string;
  size: string;
  price: string;
  estimatedFee?: string;
  chainId: number;
};

export type OrderPreviewResponse = {
  schemaVersion: string;
  previewId: string;
  contentHash: string;
  expiresAt: string;
  humanSummary: OrderPreviewHumanSummary;
  unsignedPayload: UnsignedOrderPayload;
  exchangeDomain: "standard" | "neg_risk";
  warnings?: string[];
};

export type OrderSubmitRequest = {
  previewId: string;
  contentHash: string;
  signature: string;
};

export type OrderSubmitResponse = {
  schemaVersion: string;
  orderId: string;
  status: string;
  submittedAt?: string;
  warnings?: string[];
};

export type UserOrder = {
  orderId: string;
  venueOrderId?: string;
  marketId: string;
  tokenId: string;
  side: OrderSide;
  price: string;
  originalSize: string;
  filledSize: string;
  remainingSize: string;
  status: string;
  exchangeDomain: "standard" | "neg_risk";
  createdAt: string;
  updatedAt: string;
};

export type OrdersListResponse = {
  schemaVersion: string;
  orders: UserOrder[];
  page: { limit: number; cursor?: string };
  checkedAt: string;
  provenance: { source: string; observedAt: string; upstreamId?: string };
};

function marketsUrl(path: string): string {
  const origin = getMarketsApiOrigin();
  if (!origin) {
    throw new TradingApiError("unavailable", "Markets API origin is not configured.", 0);
  }
  return `${origin}${MARKETS_API_BASE}${path}`;
}

export function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function parseApiError(response: Response): Promise<TradingApiError> {
  let code: string | undefined;
  let message: string | undefined;
  let requestId: string | undefined;
  try {
    const body = (await response.json()) as ApiErrorBody;
    code = body.error?.code;
    message = body.error?.message;
    requestId = body.error?.requestId;
  } catch {
    // ignore JSON parse failures
  }

  if (response.status === 401) {
    return new TradingApiError("unauthorized", message ?? "Authentication required.", 401, requestId);
  }
  if (response.status === 403) {
    return new TradingApiError("forbidden", message ?? "Eligibility denied.", 403, requestId);
  }
  if (response.status === 400) {
    return new TradingApiError("invalid_request", message ?? "Invalid order parameters.", 400, requestId);
  }
  if (response.status === 404) {
    return new TradingApiError("not_found", message ?? "Market or token not found.", 404, requestId);
  }
  if (response.status === 409) {
    const mapped =
      code === "integrity_mismatch"
        ? "integrity_mismatch"
        : code === "maker_not_linked"
          ? "conflict"
          : "conflict";
    return new TradingApiError(mapped as TradingApiErrorCode, message ?? "Conflict.", 409, requestId);
  }
  if (response.status === 410) {
    return new TradingApiError("preview_expired", message ?? "Preview expired.", 410, requestId);
  }
  if (response.status === 404 || response.status === 501 || response.status === 503) {
    return new TradingApiError("unavailable", message ?? "Endpoint not available.", response.status, requestId);
  }
  if (response.status === 502) {
    return new TradingApiError(
      "upstream_unavailable",
      message ?? "Upstream unavailable.",
      502,
      requestId,
    );
  }
  return new TradingApiError(
    "unknown",
    message ?? `Request failed (${response.status}).`,
    response.status,
    requestId,
  );
}

async function postJson<T>(
  path: string,
  body: unknown,
  options?: { idempotencyKey?: string; signal?: AbortSignal },
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options?.idempotencyKey) {
    headers["Idempotency-Key"] = options.idempotencyKey;
  }
  const response = await fetch(marketsUrl(path), {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify(body),
    signal: options?.signal,
  });
  if (!response.ok) {
    throw await parseApiError(response);
  }
  return (await response.json()) as T;
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(marketsUrl(path), {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) {
    throw await parseApiError(response);
  }
  return (await response.json()) as T;
}

export async function previewOrder(
  payload: OrderPreviewRequest,
  signal?: AbortSignal,
): Promise<OrderPreviewResponse> {
  const idempotencyKey = payload.idempotencyKey ?? newIdempotencyKey();
  const { idempotencyKey: _omit, ...body } = payload;
  return postJson<OrderPreviewResponse>("/orders/preview", body, { idempotencyKey, signal });
}

export async function submitOrder(
  payload: OrderSubmitRequest,
  signal?: AbortSignal,
): Promise<OrderSubmitResponse> {
  return postJson<OrderSubmitResponse>("/orders/submit", payload, {
    idempotencyKey: newIdempotencyKey(),
    signal,
  });
}

export async function listMyOrders(
  params?: { status?: string; marketId?: string; tokenId?: string },
  signal?: AbortSignal,
): Promise<OrdersListResponse> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.marketId) query.set("marketId", params.marketId);
  if (params?.tokenId) query.set("tokenId", params.tokenId);
  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  return getJson<OrdersListResponse>(`/me/orders${suffix}`, signal);
}
