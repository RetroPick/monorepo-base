export type RealtimeConnectionState =
  | "idle"
  | "connecting"
  | "snapshot_wait"
  | "live"
  | "degraded"
  | "resyncing"
  | "polling_fallback";

export type RealtimeEventType =
  | "hello"
  | "subscribed"
  | "unsubscribed"
  | "orderbook.snapshot"
  | "orderbook.delta"
  | "trade.executed"
  | "market.tick_size_changed"
  | "market.updated"
  | "signal.created"
  | "signal.retracted"
  | "resync.required"
  | "error";

export interface RealtimeEnvelope<T = unknown> {
  schemaVersion: string;
  eventId: string;
  eventType: RealtimeEventType;
  source: string;
  marketId: string;
  upstreamId: string;
  tokenId: string;
  snapshotHash?: string;
  sequence: null;
  streamEpoch: number;
  deliveryCounter: number;
  observedAt: string;
  publishedAt: string;
  payload: T;
}

export interface MarketsRealtimeClientConfig {
  baseUrl: string;
  reconnectMinMs?: number;
  reconnectMaxMs?: number;
  /** @internal test hook */
  scheduleImpl?: (fn: () => void, delay: number) => ReturnType<typeof globalThis.setTimeout>;
  /** @internal test hook */
  randomImpl?: () => number;
}

export type RealtimeMessageHandler = (envelope: RealtimeEnvelope) => void;
export type RealtimeStateHandler = (state: RealtimeConnectionState) => void;

export const REALTIME_SCHEMA_VERSION = "1";

const CONTROL_EVENT_TYPES = new Set<RealtimeEventType>([
  "hello",
  "subscribed",
  "unsubscribed",
  "error",
]);

const DATA_EVENT_TYPES = new Set<RealtimeEventType>([
  "orderbook.snapshot",
  "orderbook.delta",
  "trade.executed",
  "market.tick_size_changed",
  "market.updated",
  "signal.created",
  "signal.retracted",
  "resync.required",
]);

type ParsedEnvelope = Partial<RealtimeEnvelope> & {
  eventType?: string;
  sequence?: null | string | number;
};

function wsUrl(baseUrl: string): string {
  const url = new URL(baseUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/api/v1/markets/realtime";
  url.search = "";
  url.hash = "";
  return url.toString();
}

function isKnownEventType(eventType: string): eventType is RealtimeEventType {
  return CONTROL_EVENT_TYPES.has(eventType as RealtimeEventType) ||
    DATA_EVENT_TYPES.has(eventType as RealtimeEventType);
}

function hasNonNullSequence(sequence: ParsedEnvelope["sequence"]): boolean {
  return sequence !== null && sequence !== undefined;
}

export function isControlEnvelope(envelope: ParsedEnvelope): boolean {
  return typeof envelope.eventType === "string" && CONTROL_EVENT_TYPES.has(envelope.eventType as RealtimeEventType);
}

export function isDataEnvelope(envelope: ParsedEnvelope): boolean {
  return typeof envelope.eventType === "string" && DATA_EVENT_TYPES.has(envelope.eventType as RealtimeEventType);
}

export function validateControlEnvelope(envelope: ParsedEnvelope): boolean {
  if (envelope.schemaVersion !== REALTIME_SCHEMA_VERSION) return false;
  if (!isControlEnvelope(envelope)) return false;
  if (hasNonNullSequence(envelope.sequence)) return false;
  return true;
}

export function validateDataEnvelope(envelope: ParsedEnvelope): boolean {
  if (envelope.schemaVersion !== REALTIME_SCHEMA_VERSION) return false;
  if (!isDataEnvelope(envelope)) return false;
  if (hasNonNullSequence(envelope.sequence)) return false;
  if (
    typeof envelope.eventId !== "string" ||
    typeof envelope.source !== "string" ||
    typeof envelope.marketId !== "string" ||
    typeof envelope.upstreamId !== "string" ||
    typeof envelope.tokenId !== "string" ||
    typeof envelope.observedAt !== "string" ||
    typeof envelope.publishedAt !== "string" ||
    envelope.payload === undefined
  ) {
    return false;
  }
  if (typeof envelope.streamEpoch !== "number" || envelope.streamEpoch < 0) return false;
  if (typeof envelope.deliveryCounter !== "number" || envelope.deliveryCounter < 0) return false;
  return true;
}

function matchesSubscription(
  envelope: ParsedEnvelope,
  subscription: { marketId: string; tokenId: string } | null,
): boolean {
  if (!subscription) return false;
  return envelope.marketId === subscription.marketId && envelope.tokenId === subscription.tokenId;
}

export class MarketsRealtimeClient {
  private socket: WebSocket | null = null;
  private readonly handlers = new Set<RealtimeMessageHandler>();
  private stateHandler: RealtimeStateHandler | null = null;
  private streamEpoch = 0;
  private lastCounter = 0;
  private subscription: { marketId: string; tokenId: string } | null = null;
  private reconnectAttempt = 0;
  private closed = true;
  private backgrounded = false;
  private awaitingSnapshot = true;
  private updatesPaused = false;
  private reconnectTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
  private connectionState: RealtimeConnectionState = "idle";
  private readonly schedule: (fn: () => void, delay: number) => ReturnType<typeof globalThis.setTimeout>;
  private readonly random: () => number;

  constructor(private readonly config: MarketsRealtimeClientConfig) {
    this.schedule = config.scheduleImpl ?? ((fn, delay) => globalThis.setTimeout(fn, delay));
    this.random = config.randomImpl ?? Math.random;
  }

  onMessage(handler: RealtimeMessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  onState(handler: RealtimeStateHandler): () => void {
    this.stateHandler = handler;
    return () => {
      if (this.stateHandler === handler) this.stateHandler = null;
    };
  }

  setBackgrounded(value: boolean): void {
    if (this.backgrounded === value) return;
    this.backgrounded = value;
    if (value) {
      this.cancelReconnectTimer();
      this.closeSocket();
      if (!this.closed && this.subscription) {
        this.setState("polling_fallback");
      }
    }
  }

  resumeIfNeeded(): void {
    if (this.closed || this.backgrounded || !this.subscription) return;
    this.cancelReconnectTimer();
    this.reconnectAttempt = 0;
    this.beginRecovery("connecting");
  }

  connect(marketId: string, tokenId: string): void {
    this.cancelReconnectTimer();
    this.closeSocket();
    this.closed = false;
    this.subscription = { marketId, tokenId };
    this.resetStreamTracking();
    this.reconnectAttempt = 0;
    this.beginRecovery("connecting");
  }

  disconnect(): void {
    this.closed = true;
    this.subscription = null;
    this.cancelReconnectTimer();
    this.closeSocket();
    this.awaitingSnapshot = true;
    this.updatesPaused = false;
    this.setState("idle");
  }

  private resetStreamTracking(): void {
    this.streamEpoch = 0;
    this.lastCounter = 0;
    this.awaitingSnapshot = true;
    this.updatesPaused = false;
  }

  private beginRecovery(nextState: RealtimeConnectionState): void {
    if (this.backgrounded) {
      this.setState("polling_fallback");
      return;
    }
    this.openSocket(nextState);
  }

  private openSocket(nextState: RealtimeConnectionState = "connecting"): void {
    if (!this.subscription || this.closed || this.backgrounded) return;
    this.closeSocket();
    this.setState(nextState);
    const socket = new WebSocket(wsUrl(this.config.baseUrl));
    this.socket = socket;
    socket.onopen = () => {
      if (this.socket !== socket || this.closed || !this.subscription) return;
      this.reconnectAttempt = 0;
      this.awaitingSnapshot = true;
      this.updatesPaused = false;
      this.setState("snapshot_wait");
      const { marketId, tokenId } = this.subscription;
      socket.send(JSON.stringify({ command: "subscribe", marketId, tokenId }));
    };
    socket.onmessage = (event) => this.handleMessage(String(event.data));
    socket.onerror = () => {
      if (this.socket !== socket) return;
      this.enterPollingFallback();
    };
    socket.onclose = () => {
      if (this.socket !== socket) return;
      this.socket = null;
      if (!this.closed && !this.backgrounded) {
        this.scheduleReconnect();
      } else if (this.closed) {
        this.setState("idle");
      } else {
        this.setState("polling_fallback");
      }
    };
  }

  private handleMessage(raw: string): void {
    let parsed: ParsedEnvelope;
    try {
      parsed = JSON.parse(raw) as ParsedEnvelope;
    } catch {
      return;
    }

    if (typeof parsed.eventType !== "string" || !isKnownEventType(parsed.eventType)) {
      return;
    }

    if (isControlEnvelope(parsed)) {
      if (!validateControlEnvelope(parsed)) return;
      this.handleControlMessage(parsed);
      return;
    }

    if (!validateDataEnvelope(parsed)) return;
    if (!matchesSubscription(parsed, this.subscription)) return;

    const envelope = parsed as RealtimeEnvelope;

    if (envelope.eventType === "resync.required") {
      this.handleResyncRequired(envelope);
      return;
    }

    if (envelope.streamEpoch < this.streamEpoch) {
      return;
    }

    if (envelope.streamEpoch > this.streamEpoch) {
      this.streamEpoch = envelope.streamEpoch;
      this.lastCounter = 0;
      this.awaitingSnapshot = true;
      this.updatesPaused = false;
      this.setState("snapshot_wait");
    }

    if (this.updatesPaused) {
      if (envelope.eventType !== "orderbook.snapshot") {
        return;
      }
      this.updatesPaused = false;
      this.awaitingSnapshot = false;
      this.lastCounter = envelope.deliveryCounter;
      this.setState("live");
      this.dispatch(envelope);
      return;
    }

    if (this.awaitingSnapshot) {
      if (envelope.eventType !== "orderbook.snapshot") {
        return;
      }
      this.awaitingSnapshot = false;
      this.lastCounter = envelope.deliveryCounter;
      this.setState("live");
      this.dispatch(envelope);
      return;
    }

    if (this.hasDeliveryGap(envelope)) {
      this.handleDeliveryGap();
      return;
    }

    if (envelope.deliveryCounter > 0) {
      this.lastCounter = envelope.deliveryCounter;
    }

    if (envelope.eventType === "orderbook.snapshot") {
      this.setState("live");
      this.dispatch(envelope);
      return;
    }

    if (this.connectionState !== "live") {
      return;
    }

    this.dispatch(envelope);
  }

  private handleControlMessage(envelope: ParsedEnvelope): void {
    switch (envelope.eventType) {
      case "hello":
      case "subscribed":
      case "unsubscribed":
        return;
      case "error":
        this.enterPollingFallback();
        this.scheduleReconnect();
        return;
      default: {
        const _exhaustive: never = envelope.eventType as never;
        return _exhaustive;
      }
    }
  }

  private handleResyncRequired(envelope: RealtimeEnvelope): void {
    this.streamEpoch = envelope.streamEpoch;
    this.lastCounter = 0;
    this.awaitingSnapshot = true;
    this.updatesPaused = true;
    this.setState("resyncing");
    this.triggerResync();
  }

  private handleDeliveryGap(): void {
    this.updatesPaused = true;
    this.awaitingSnapshot = true;
    this.setState("resyncing");
    this.triggerResync();
  }

  private hasDeliveryGap(envelope: RealtimeEnvelope): boolean {
    return (
      envelope.deliveryCounter > 0 &&
      this.lastCounter > 0 &&
      envelope.deliveryCounter !== this.lastCounter + 1
    );
  }

  private triggerResync(): void {
    if (this.closed || this.backgrounded || !this.subscription) {
      this.setState("polling_fallback");
      return;
    }
    this.cancelReconnectTimer();
    this.closeSocket();
    this.reconnectAttempt = 0;
    this.beginRecovery("resyncing");
  }

  private scheduleReconnect(): void {
    if (this.closed || this.backgrounded || !this.subscription) {
      this.setState(this.closed ? "idle" : "polling_fallback");
      return;
    }
    this.cancelReconnectTimer();
    this.setState("polling_fallback");
    const min = this.config.reconnectMinMs ?? 1000;
    const max = this.config.reconnectMaxMs ?? 30000;
    const exponential = Math.min(max, min * 2 ** this.reconnectAttempt);
    const jitter = Math.floor(this.random() * min);
    const delay = Math.min(max, exponential + jitter);
    this.reconnectAttempt += 1;
    this.reconnectTimer = this.schedule(() => {
      this.reconnectTimer = null;
      this.beginRecovery("connecting");
    }, delay);
  }

  private enterPollingFallback(): void {
    this.setState("polling_fallback");
  }

  private cancelReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      globalThis.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private closeSocket(): void {
    const socket = this.socket;
    if (!socket) return;
    socket.onopen = null;
    socket.onmessage = null;
    socket.onerror = null;
    socket.onclose = null;
    if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
      socket.close();
    }
    this.socket = null;
  }

  private dispatch(envelope: RealtimeEnvelope): void {
    this.handlers.forEach((handler) => handler(envelope));
  }

  private setState(state: RealtimeConnectionState): void {
    if (this.connectionState === state) return;
    this.connectionState = state;
    this.stateHandler?.(state);
  }
}

export function createMarketsRealtimeClient(config: MarketsRealtimeClientConfig): MarketsRealtimeClient {
  return new MarketsRealtimeClient(config);
}

export function realtimeStateLabel(state: RealtimeConnectionState): string {
  switch (state) {
    case "live":
      return "Live";
    case "snapshot_wait":
      return "Snapshot";
    case "connecting":
      return "Reconnecting";
    case "resyncing":
      return "Resynchronizing";
    case "degraded":
      return "Delayed";
    case "polling_fallback":
      return "Realtime unavailable";
    case "idle":
      return "Snapshot";
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}
