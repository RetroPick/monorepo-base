// MARKETS_CUSTODY: BFF funding client — session cookie only, no relayer secrets in client

import { getMarketsApiOrigin } from "../../wallet/config/runtimeEnv";

import type { MoneyAmount } from "./formatCollateral";

const MARKETS_API_BASE = "/api/v1/markets";

export type FundingApiErrorCode =
  | "unauthorized"
  | "account_not_linked"
  | "upstream_unavailable"
  | "unavailable"
  | "invalid_request"
  | "conflict"
  | "network"
  | "unknown";

export class FundingApiError extends Error {
  readonly code: FundingApiErrorCode;
  readonly status: number;
  readonly requestId?: string;

  constructor(code: FundingApiErrorCode, message: string, status: number, requestId?: string) {
    super(message);
    this.name = "FundingApiError";
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

export type BalancesListResponse = {
  schemaVersion: string;
  signerAddress: string;
  accountWallet: string;
  collateral: MoneyAmount;
  checkedAt: string;
};

export type WalletType = "EOA" | "POLY_PROXY" | "GNOSIS_SAFE" | "DEPOSIT_WALLET";
export type LinkStatus = "linked" | "pending_verification";
export type AccountWalletAction = "link_existing" | "deploy_deposit_wallet";

export type LinkedWallet = {
  accountWallet: string;
  walletType: WalletType;
  linkStatus: LinkStatus;
  isPrimary: boolean;
  chainId: number;
};

export type LinkExistingWalletRequest = {
  accountWallet: string;
  walletType: WalletType;
  linkStatus?: LinkStatus;
  isPrimary?: boolean;
  chainId?: number;
  linkageProofHash?: string;
};

export type AccountWalletPreviewRequest = {
  action?: AccountWalletAction;
};

export type AccountWalletPreviewResponse = {
  schemaVersion: string;
  signerAddress: string;
  action: AccountWalletAction;
  chainId: number;
  message: string;
};

export type AccountWalletRelayRequest = {
  accountWallet: string;
  chainId?: number;
  isPrimary?: boolean;
  linkageProofHash?: string;
};

export type AccountWalletRelayResponse = {
  schemaVersion: string;
  signerAddress: string;
  wallet: LinkedWallet;
};

function marketsUrl(path: string): string {
  const origin = getMarketsApiOrigin();
  if (!origin) {
    throw new FundingApiError("unavailable", "Markets API origin is not configured.", 0);
  }
  return `${origin}${MARKETS_API_BASE}${path}`;
}

function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  throw new FundingApiError(
    "unavailable",
    "Cryptographic request identifiers are unavailable in this client.",
    0,
  );
}

async function parseApiError(response: Response): Promise<FundingApiError> {
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
    return new FundingApiError("unauthorized", message ?? "Authentication required.", 401, requestId);
  }
  if (response.status === 400 && code === "invalid_request") {
    return new FundingApiError(
      "invalid_request",
      message ?? "Invalid request.",
      400,
      requestId,
    );
  }
  if (response.status === 404 && code === "account_not_linked") {
    return new FundingApiError(
      "account_not_linked",
      message ?? "No linked account wallet.",
      404,
      requestId,
    );
  }
  if (response.status === 409 && code === "conflict") {
    return new FundingApiError("conflict", message ?? "Wallet linkage conflict.", 409, requestId);
  }
  if (response.status === 404 || response.status === 501 || response.status === 503) {
    return new FundingApiError("unavailable", message ?? "Endpoint not available.", response.status, requestId);
  }
  if (response.status === 502) {
    return new FundingApiError(
      "upstream_unavailable",
      message ?? "Upstream unavailable.",
      502,
      requestId,
    );
  }
  return new FundingApiError(
    "unknown",
    message ?? `Request failed (${response.status}).`,
    response.status,
    requestId,
  );
}

async function postJson<T>(
  path: string,
  body: unknown,
  options?: { idempotency?: boolean; signal?: AbortSignal },
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options?.idempotency) {
    headers["Idempotency-Key"] = newIdempotencyKey();
  }
  const response = await fetch(marketsUrl(path), {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers,
    body: JSON.stringify(body),
    signal: options?.signal,
  });
  if (!response.ok) {
    throw await parseApiError(response);
  }
  return (await response.json()) as T;
}

export async function getBalances(signal?: AbortSignal): Promise<BalancesListResponse> {
  const response = await fetch(marketsUrl("/me/balances"), {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    signal,
  });
  if (!response.ok) {
    throw await parseApiError(response);
  }
  return (await response.json()) as BalancesListResponse;
}

export async function linkExistingWallet(
  payload: LinkExistingWalletRequest,
  signal?: AbortSignal,
): Promise<LinkedWallet> {
  return postJson<LinkedWallet>("/me/wallets/link", payload, { idempotency: true, signal });
}

export async function previewAccountWallet(
  payload: AccountWalletPreviewRequest = {},
  signal?: AbortSignal,
): Promise<AccountWalletPreviewResponse> {
  return postJson<AccountWalletPreviewResponse>("/account-wallet/preview", payload, { signal });
}

export async function relayAccountWallet(
  payload: AccountWalletRelayRequest,
  signal?: AbortSignal,
): Promise<AccountWalletRelayResponse> {
  return postJson<AccountWalletRelayResponse>("/account-wallet/relay", payload, {
    idempotency: true,
    signal,
  });
}
