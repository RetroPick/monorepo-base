import type { components } from "./generated/api";
import { EtagCache } from "./etag-cache";
import { MarketsApiError, mapStatusToErrorCode, parseRetryAfterMs } from "./errors";

export type {
  components,
};

export type EligibilityResponse = components["schemas"]["EligibilityResponse"];
export type CapabilitiesResponse = components["schemas"]["CapabilitiesResponse"];
export type EventsListResponse = components["schemas"]["EventsListResponse"];
export type EventDetail = components["schemas"]["EventDetail"];
export type EventSummary = components["schemas"]["EventSummary"];
export type MarketDetail = components["schemas"]["MarketDetail"];
export type MarketSummary = components["schemas"]["MarketSummary"];
export type OrderBookSnapshot = components["schemas"]["OrderBookSnapshot"];
export type PriceHistoryResponse = components["schemas"]["PriceHistoryResponse"];
export type MarketHealthSnapshot = components["schemas"]["MarketHealthSnapshot"];
export type SignalsListResponse = components["schemas"]["SignalsListResponse"];
export type HealthResponse = components["schemas"]["HealthResponse"];
export type MarketFreshness = components["schemas"]["MarketFreshness"];
export type FreshnessState = components["schemas"]["FreshnessState"];
export type UpstreamProvenance = components["schemas"]["UpstreamProvenance"];

export type HistoryInterval = "1h" | "6h" | "1d" | "1w" | "max";

export interface MarketsClientConfig {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  defaultTimeoutMs?: number;
  etagCache?: EtagCache;
}

export interface RequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  ifNoneMatch?: string;
}

export interface JsonResponse<T> {
  data: T;
  status: number;
  etag?: string;
  requestId?: string;
  notModified: boolean;
}

const API_PREFIX = "/api/v1";

function joinUrl(base: string, path: string): string {
  const normalizedBase = base.replace(/\/$/, "");
  return `${normalizedBase}${path}`;
}

function resolveBaseUrl(configured?: string): string {
  if (configured && configured.length > 0) {
    return configured.replace(/\/$/, "");
  }
  return "";
}

export class MarketsClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly defaultTimeoutMs: number;
  private readonly etagCache: EtagCache;

  constructor(config: MarketsClientConfig = {}) {
    this.baseUrl = resolveBaseUrl(config.baseUrl);
    this.fetchImpl = config.fetchImpl ?? fetch.bind(globalThis);
    this.defaultTimeoutMs = config.defaultTimeoutMs ?? 15_000;
    this.etagCache = config.etagCache ?? new EtagCache();
  }

  getEligibility(options?: RequestOptions): Promise<JsonResponse<EligibilityResponse>> {
    return this.getJson<EligibilityResponse>(`${API_PREFIX}/markets/eligibility`, options);
  }

  getCapabilities(options?: RequestOptions): Promise<JsonResponse<CapabilitiesResponse>> {
    return this.getJson<CapabilitiesResponse>(`${API_PREFIX}/markets/capabilities`, options);
  }

  listEvents(
    params?: { cursor?: string; limit?: number },
    options?: RequestOptions,
  ): Promise<JsonResponse<EventsListResponse>> {
    const search = new URLSearchParams();
    if (params?.cursor) search.set("cursor", params.cursor);
    if (params?.limit != null) search.set("limit", String(params.limit));
    const qs = search.toString();
    const path = `${API_PREFIX}/markets/events${qs ? `?${qs}` : ""}`;
    return this.getJson<EventsListResponse>(path, options, { useEtag: true });
  }

  getEvent(eventId: string, options?: RequestOptions): Promise<JsonResponse<EventDetail>> {
    const encoded = encodeURIComponent(eventId);
    return this.getJson<EventDetail>(`${API_PREFIX}/markets/events/${encoded}`, options);
  }

  getMarket(marketId: string, options?: RequestOptions): Promise<JsonResponse<MarketDetail>> {
    const encoded = encodeURIComponent(marketId);
    return this.getJson<MarketDetail>(`${API_PREFIX}/markets/markets/${encoded}`, options);
  }

  getOrderBook(
    marketId: string,
    tokenId: string,
    options?: RequestOptions,
  ): Promise<JsonResponse<OrderBookSnapshot>> {
    const encoded = encodeURIComponent(marketId);
    const search = new URLSearchParams({ tokenId });
    return this.getJson<OrderBookSnapshot>(
      `${API_PREFIX}/markets/markets/${encoded}/orderbook?${search}`,
      options,
    );
  }

  getPriceHistory(
    marketId: string,
    params: { tokenId: string; interval?: HistoryInterval; fidelity?: number },
    options?: RequestOptions,
  ): Promise<JsonResponse<PriceHistoryResponse>> {
    const encoded = encodeURIComponent(marketId);
    const search = new URLSearchParams({ tokenId: params.tokenId });
    if (params.interval) search.set("interval", params.interval);
    if (params.fidelity != null) search.set("fidelity", String(params.fidelity));
    return this.getJson<PriceHistoryResponse>(
      `${API_PREFIX}/markets/markets/${encoded}/history?${search}`,
      options,
    );
  }

  getMarketHealth(
    marketId: string,
    tokenId: string,
    options?: RequestOptions,
  ): Promise<JsonResponse<MarketHealthSnapshot>> {
    const encoded = encodeURIComponent(marketId);
    const search = new URLSearchParams({ tokenId });
    return this.getJson<MarketHealthSnapshot>(
      `${API_PREFIX}/markets/markets/${encoded}/health?${search}`,
      options,
    );
  }

  listSignals(
    params?: { cursor?: string; limit?: number; marketId?: string },
    options?: RequestOptions,
  ): Promise<JsonResponse<SignalsListResponse>> {
    const search = new URLSearchParams();
    if (params?.cursor) search.set("cursor", params.cursor);
    if (params?.limit != null) search.set("limit", String(params.limit));
    if (params?.marketId) search.set("marketId", params.marketId);
    const qs = search.toString();
    return this.getJson<SignalsListResponse>(
      `${API_PREFIX}/markets/intelligence/signals${qs ? `?${qs}` : ""}`,
      options,
    );
  }

  getLiveness(options?: RequestOptions): Promise<JsonResponse<HealthResponse>> {
    return this.getJson<HealthResponse>("/health/live", options);
  }

  getReadiness(options?: RequestOptions): Promise<JsonResponse<HealthResponse>> {
    return this.getJson<HealthResponse>("/health/ready", options);
  }

  private async getJson<T>(
    path: string,
    options: RequestOptions = {},
    behavior: { useEtag?: boolean } = {},
  ): Promise<JsonResponse<T>> {
    const url = joinUrl(this.baseUrl, path);
    const timeoutMs = options.timeoutMs ?? this.defaultTimeoutMs;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const onAbort = () => controller.abort();
    options.signal?.addEventListener("abort", onAbort, { once: true });

    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    let cached: { etag: string; body: unknown } | undefined;
    if (behavior.useEtag) {
      cached = this.etagCache.get(url);
      const etag = options.ifNoneMatch ?? cached?.etag;
      if (etag) headers["If-None-Match"] = etag;
    }

    try {
      const res = await this.fetchImpl(url, {
        method: "GET",
        headers,
        signal: controller.signal,
      });

      const requestId = res.headers.get("x-request-id") ?? undefined;
      const etag = res.headers.get("etag") ?? undefined;

      if (res.status === 304 && cached) {
        return {
          data: cached.body as T,
          status: 304,
          etag: cached.etag,
          requestId,
          notModified: true,
        };
      }

      if (!res.ok) {
        await this.throwApiError(res, requestId);
      }

      let data: T;
      try {
        data = (await res.json()) as T;
      } catch (cause) {
        throw new MarketsApiError("Malformed JSON response", {
          status: res.status,
          code: "malformed",
          requestId,
          cause,
        });
      }

      if (behavior.useEtag && etag) {
        this.etagCache.set(url, etag, data);
      }

      return { data, status: res.status, etag, requestId, notModified: false };
    } catch (error) {
      if (error instanceof MarketsApiError) throw error;
      if (error instanceof DOMException && error.name === "AbortError") {
        if (options.signal?.aborted) {
          throw new MarketsApiError("Request aborted", { status: 0, code: "aborted", cause: error });
        }
        throw new MarketsApiError("Request timed out", { status: 0, code: "timeout", cause: error });
      }
      throw new MarketsApiError("Network request failed", {
        status: 0,
        code: "network",
        cause: error,
      });
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener("abort", onAbort);
    }
  }

  private async throwApiError(res: Response, requestId?: string): Promise<never> {
    const retryAfterMs = parseRetryAfterMs(res.headers.get("retry-after"));
    let body: components["schemas"]["ApiError"] | undefined;
    try {
      body = (await res.json()) as components["schemas"]["ApiError"];
    } catch {
      body = undefined;
    }
    const apiCode = body?.error?.code;
    const message = body?.error?.message ?? `HTTP ${res.status}`;
    const rid = body?.error?.requestId ?? requestId;
    throw new MarketsApiError(message, {
      status: res.status,
      code: mapStatusToErrorCode(res.status, apiCode),
      requestId: rid,
      retryAfterMs,
      body,
    });
  }
}

export function createMarketsClient(config?: MarketsClientConfig): MarketsClient {
  return new MarketsClient(config);
}
