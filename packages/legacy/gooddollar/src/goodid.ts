/**
 * GoodDollar status from backend `/api/v1/gooddollar/status`.
 * Shape aligned with apps/web/src/features/gooddollar/useGoodDollarStatus.ts.
 */
export type GoodDollarStatus = {
  wallet: string;
  chainId: number;
  gDollarBalance: string;
  goodIdVerified: boolean;
  rootWallet?: string;
  lastCheckedAt?: string;
  canClaimOrReceiveG: boolean;
};

export type GoodDollarStatusResult =
  | { kind: "ok"; data: GoodDollarStatus }
  | { kind: "disabled" }
  | { kind: "error"; code: "http" | "network" | "parse"; message: string; status?: number };

export class GoodDollarStatusError extends Error {
  readonly code: "http" | "network" | "parse";
  readonly status?: number;

  constructor(code: "http" | "network" | "parse", message: string, status?: number) {
    super(message);
    this.name = "GoodDollarStatusError";
    this.code = code;
    this.status = status;
  }
}

/** @deprecated Use GoodDollarStatus */
export type GoodIDStatus = Pick<GoodDollarStatus, "goodIdVerified" | "rootWallet" | "lastCheckedAt"> & {
  verified: boolean;
};

function parseStatusPayload(raw: unknown): GoodDollarStatus | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  if (typeof data.wallet !== "string" || typeof data.chainId !== "number") return null;
  if (typeof data.gDollarBalance !== "string" || typeof data.goodIdVerified !== "boolean") return null;
  if (typeof data.canClaimOrReceiveG !== "boolean") return null;
  return {
    wallet: data.wallet,
    chainId: data.chainId,
    gDollarBalance: data.gDollarBalance,
    goodIdVerified: data.goodIdVerified,
    rootWallet: typeof data.rootWallet === "string" ? data.rootWallet : undefined,
    lastCheckedAt: typeof data.lastCheckedAt === "string" ? data.lastCheckedAt : undefined,
    canClaimOrReceiveG: data.canClaimOrReceiveG,
  };
}

/** Fetch GoodDollar status; never masks HTTP/network failures as unverified. */
export async function fetchGoodDollarStatus(
  apiBase: string,
  wallet: string,
): Promise<GoodDollarStatusResult> {
  let res: Response;
  try {
    const url = new URL(`${apiBase.replace(/\/$/, "")}/api/v1/gooddollar/status`);
    url.searchParams.set("wallet", wallet);
    res = await fetch(url.toString());
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { kind: "error", code: "network", message };
  }

  if (res.status === 404) {
    return { kind: "disabled" };
  }

  if (!res.ok) {
    return {
      kind: "error",
      code: "http",
      status: res.status,
      message: `gooddollar status request failed: ${res.status}`,
    };
  }

  try {
    const parsed = parseStatusPayload(await res.json());
    if (!parsed) {
      return { kind: "error", code: "parse", message: "invalid gooddollar status payload" };
    }
    return { kind: "ok", data: parsed };
  } catch {
    return { kind: "error", code: "parse", message: "failed to parse gooddollar status JSON" };
  }
}

/** Throws GoodDollarStatusError on HTTP/network/parse failures; returns null when feature disabled (404). */
export async function fetchGoodDollarStatusOrThrow(
  apiBase: string,
  wallet: string,
): Promise<GoodDollarStatus | null> {
  const result = await fetchGoodDollarStatus(apiBase, wallet);
  if (result.kind === "ok") return result.data;
  if (result.kind === "disabled") return null;
  throw new GoodDollarStatusError(result.code, result.message, result.status);
}

/** @deprecated Use fetchGoodDollarStatus — kept for early scaffold callers. */
export async function fetchGoodIDStatus(apiBase: string, wallet: string): Promise<GoodIDStatus> {
  const result = await fetchGoodDollarStatus(apiBase, wallet);
  if (result.kind === "error") {
    throw new GoodDollarStatusError(result.code, result.message, result.status);
  }
  if (result.kind === "disabled") {
    return { verified: false, goodIdVerified: false };
  }
  return {
    verified: result.data.goodIdVerified,
    goodIdVerified: result.data.goodIdVerified,
    rootWallet: result.data.rootWallet,
    lastCheckedAt: result.data.lastCheckedAt,
  };
}
