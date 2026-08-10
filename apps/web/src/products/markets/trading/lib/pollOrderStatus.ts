import { listMyOrders, type UserOrder } from "./tradingApiClient";

export type OrderPollResult =
  | { kind: "resolved"; order: UserOrder }
  | { kind: "timeout"; lastSeen: UserOrder | null }
  | { kind: "aborted" };

const DEFAULT_INTERVAL_MS = 5_000;
const DEFAULT_TIMEOUT_MS = 120_000;

export function isTerminalOrderStatus(status: string): boolean {
  switch (status) {
    case "open":
    case "partially_filled":
    case "filled":
    case "canceled":
    case "rejected":
    case "expired":
      return true;
    default:
      return false;
  }
}

export function isOrderSuccessStatus(status: string): boolean {
  return status === "open" || status === "partially_filled" || status === "filled";
}

export function needsReconcilePolling(status: string, warnings?: string[]): boolean {
  if (status === "unknown") {
    return true;
  }
  return warnings?.includes("unknown_reconciling") ?? false;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

export async function pollOrderUntilTerminal(
  orderId: string,
  options?: {
    intervalMs?: number;
    timeoutMs?: number;
    signal?: AbortSignal;
    listOrders?: typeof listMyOrders;
  },
): Promise<OrderPollResult> {
  const intervalMs = options?.intervalMs ?? DEFAULT_INTERVAL_MS;
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const fetchOrders = options?.listOrders ?? listMyOrders;
  const deadline = Date.now() + timeoutMs;
  let lastSeen: UserOrder | null = null;

  while (Date.now() < deadline) {
    if (options?.signal?.aborted) {
      return { kind: "aborted" };
    }

    const response = await fetchOrders({ status: "open" }, options?.signal);
    const match = response.orders.find((row) => row.orderId === orderId) ?? null;
    if (match) {
      lastSeen = match;
      if (isTerminalOrderStatus(match.status)) {
        return { kind: "resolved", order: match };
      }
    }

    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      break;
    }
    await sleep(Math.min(intervalMs, remaining), options?.signal);
  }

  return { kind: "timeout", lastSeen };
}
