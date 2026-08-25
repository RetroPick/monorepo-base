// MARKETS_CUSTODY: BFF auth client — HttpOnly session cookie only, no JWT in storage

import { getMarketsApiOrigin } from "../config/runtimeEnv";
import { POLYGON_CHAIN_ID } from "../config/chains";
import { mapAuthError, MarketsAuthError } from "./walletErrors";
import { readCookie } from "./readCookie";

const AUTH_BASE = "/api/v1/markets/auth";
const CSRF_COOKIE_NAME = "mkt_csrf";
const CSRF_HEADER_NAME = "X-CSRF-Token";

export type AuthNonceResponse = {
  nonce: string;
  expiresIn: number;
  chainId: number;
};

export type AuthSessionResponse = {
  authenticated: boolean;
  wallet: string;
  expiresAt: string;
};

export type SiweVerifyResponse = {
  authenticated: boolean;
  wallet: string;
  expiresAt: string;
};

type AuthErrorBody = {
  error?: {
    code?: string;
    message?: string;
  };
};

function authUrl(path: string): string {
  const origin = getMarketsApiOrigin();
  if (!origin) {
    throw new MarketsAuthError("AUTH_UNAVAILABLE", "Markets API origin is not configured.");
  }
  return `${origin}${AUTH_BASE}${path}`;
}

async function parseAuthError(response: Response): Promise<MarketsAuthError> {
  let code: string | undefined;
  let message: string | undefined;
  try {
    const body = (await response.json()) as AuthErrorBody;
    code = body.error?.code;
    message = body.error?.message;
  } catch {
    // ignore JSON parse failures
  }
  return mapAuthError(response.status, code, message);
}

export async function fetchAuthNonce(signal?: AbortSignal): Promise<AuthNonceResponse> {
  const response = await fetch(authUrl("/nonce"), {
    method: "GET",
    credentials: "include",
    signal,
  });
  if (!response.ok) {
    throw await parseAuthError(response);
  }
  const body = (await response.json()) as AuthNonceResponse;
  if (!body.nonce) {
    throw new MarketsAuthError("AUTH_FAILED", "Server did not return a nonce.");
  }
  if (body.chainId !== POLYGON_CHAIN_ID) {
    throw new MarketsAuthError("CHAIN_MISMATCH", "Server chain does not match Polygon.");
  }
  return body;
}

export async function postSiweVerify(
  payload: { message: string; signature: string },
  signal?: AbortSignal,
): Promise<SiweVerifyResponse> {
  const response = await fetch(authUrl("/siwe"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
  if (!response.ok) {
    throw await parseAuthError(response);
  }
  return (await response.json()) as SiweVerifyResponse;
}

export async function fetchAuthSession(signal?: AbortSignal): Promise<AuthSessionResponse | null> {
  const origin = getMarketsApiOrigin();
  if (!origin) {
    return null;
  }
  const response = await fetch(`${origin}${AUTH_BASE}/session`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    signal,
  });
  if (response.status === 401) {
    return null;
  }
  if (!response.ok) {
    throw await parseAuthError(response);
  }
  return (await response.json()) as AuthSessionResponse;
}

export async function postAuthLogout(signal?: AbortSignal): Promise<void> {
  const csrfToken = readCookie(CSRF_COOKIE_NAME);
  if (!csrfToken) {
    throw new MarketsAuthError("AUTH_FAILED", "Missing CSRF token for logout.");
  }
  const response = await fetch(authUrl("/logout"), {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      [CSRF_HEADER_NAME]: csrfToken,
    },
    signal,
  });
  if (!response.ok) {
    throw await parseAuthError(response);
  }
}

export function addressesMatch(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}
