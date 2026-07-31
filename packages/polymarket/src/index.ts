export type {
  CapabilitiesResponse,
  EligibilityResponse,
  EventDetail,
  EventSummary,
  EventsListResponse,
  FreshnessState,
  HealthResponse,
  HistoryInterval,
  MarketDetail,
  MarketFreshness,
  MarketHealthSnapshot,
  MarketSummary,
  OrderBookSnapshot,
  PriceHistoryResponse,
  SignalsListResponse,
  UpstreamProvenance,
} from "./client";

export { MarketsClient, createMarketsClient } from "./client";
export type { JsonResponse, MarketsClientConfig, RequestOptions } from "./client";

export { MarketsApiError, mapStatusToErrorCode, parseRetryAfterMs } from "./errors";
export type { MarketsApiErrorBody, MarketsErrorCode } from "./errors";

export { EtagCache } from "./etag-cache";

export type { components } from "./generated/api";
