export type WalletErrorCode =
  | "WALLET_REJECTED"
  | "CHAIN_MISMATCH"
  | "SESSION_PENDING"
  | "CONNECT_FAILED"
  | "AUTH_FAILED"
  | "AUTH_UNAVAILABLE"
  | "RATE_LIMITED"
  | "SESSION_EXPIRED";

export class MarketsWalletError extends Error {
  readonly code: WalletErrorCode;

  constructor(code: WalletErrorCode, message: string) {
    super(message);
    this.name = "MarketsWalletError";
    this.code = code;
  }
}

export class MarketsAuthError extends MarketsWalletError {
  constructor(code: WalletErrorCode, message: string) {
    super(code, message);
    this.name = "MarketsAuthError";
  }
}

export function mapConnectError(error: unknown): MarketsWalletError {
  if (error instanceof MarketsWalletError) return error;
  const message = error instanceof Error ? error.message : "Wallet connection failed";
  if (/reject|denied|cancel/i.test(message)) {
    return new MarketsWalletError("WALLET_REJECTED", message);
  }
  return new MarketsWalletError("CONNECT_FAILED", message);
}

export function mapAuthError(status: number, code?: string, message?: string): MarketsAuthError {
  const normalized = code?.toUpperCase();
  if (status === 429 || normalized === "RATE_LIMITED") {
    return new MarketsAuthError("RATE_LIMITED", message ?? "Too many auth requests. Try again shortly.");
  }
  if (normalized === "UNAUTHENTICATED" || normalized === "INVALID_NONCE") {
    return new MarketsAuthError("SESSION_EXPIRED", message ?? "Session expired. Sign in again.");
  }
  if (normalized === "INVALID_SIGNATURE" || normalized === "INVALID_SIWE") {
    return new MarketsAuthError("AUTH_FAILED", message ?? "Signature verification failed.");
  }
  if (normalized === "CSRF_REJECTED") {
    return new MarketsAuthError("AUTH_FAILED", message ?? "Logout rejected. Refresh and try again.");
  }
  return new MarketsAuthError("AUTH_FAILED", message ?? "Could not establish a Markets session.");
}
