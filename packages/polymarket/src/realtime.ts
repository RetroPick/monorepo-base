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
}

export type RealtimeMessageHandler = (envelope: RealtimeEnvelope) => void;
export type RealtimeStateHandler = (state: RealtimeConnectionState) => void;

function wsUrl(baseUrl: string): string {
  const url = new URL(baseUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/api/v1/markets/realtime";
  url.search = "";
  url.hash = "";
  return url.toString();
}

export class MarketsRealtimeClient {
  private socket: WebSocket | null = null;
  private readonly handlers = new Set<RealtimeMessageHandler>();
  private stateHandler: RealtimeStateHandler | null = null;
  private streamEpoch = 0;
  private lastCounter = 0;
  private subscription: { marketId: string; tokenId: string } | null = null;
  private reconnectAttempt = 0;
  private closed = false;
  private backgrounded = false;

  constructor(private readonly config: MarketsRealtimeClientConfig) {}

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
    this.backgrounded = value;
  }

  connect(marketId: string, tokenId: string): void {
    this.closed = false;
    this.subscription = { marketId, tokenId };
    this.streamEpoch = 0;
    this.lastCounter = 0;
    this.openSocket();
  }

  disconnect(): void {
    this.closed = true;
    this.subscription = null;
    this.socket?.close();
    this.socket = null;
    this.setState("idle");
  }

  private openSocket(): void {
    if (!this.subscription || this.closed) return;
    this.setState("connecting");
    const socket = new WebSocket(wsUrl(this.config.baseUrl));
    this.socket = socket;
    socket.onopen = () => {
      this.reconnectAttempt = 0;
      this.setState("snapshot_wait");
      const { marketId, tokenId } = this.subscription!;
      socket.send(JSON.stringify({ command: "subscribe", marketId, tokenId }));
    };
    socket.onmessage = (event) => this.handleMessage(String(event.data));
    socket.onerror = () => this.fallback();
    socket.onclose = () => {
      if (!this.closed) this.scheduleReconnect();
      else this.setState("idle");
    };
  }

  private handleMessage(raw: string): void {
    let envelope: RealtimeEnvelope;
    try {
      envelope = JSON.parse(raw) as RealtimeEnvelope;
    } catch {
      return;
    }
    if (envelope.eventType === "hello" || envelope.eventType === "subscribed") {
      return;
    }
    if (envelope.eventType === "resync.required") {
      this.streamEpoch = envelope.streamEpoch;
      this.lastCounter = 0;
      this.setState("resyncing");
      this.handlers.forEach((h) => h(envelope));
      return;
    }
    if (envelope.streamEpoch < this.streamEpoch) {
      return;
    }
    if (envelope.streamEpoch > this.streamEpoch) {
      this.streamEpoch = envelope.streamEpoch;
      this.lastCounter = 0;
      this.setState("snapshot_wait");
    }
    if (envelope.deliveryCounter > 0 && this.lastCounter > 0 && envelope.deliveryCounter !== this.lastCounter + 1) {
      this.setState("resyncing");
      return;
    }
    if (envelope.deliveryCounter > 0) {
      this.lastCounter = envelope.deliveryCounter;
    }
    if (envelope.eventType === "orderbook.snapshot") {
      this.setState("live");
    }
    this.handlers.forEach((h) => h(envelope));
  }

  private scheduleReconnect(): void {
    if (this.backgrounded) {
      this.fallback();
      return;
    }
    this.setState("polling_fallback");
    const min = this.config.reconnectMinMs ?? 1000;
    const max = this.config.reconnectMaxMs ?? 30000;
    const delay = Math.min(max, min * 2 ** this.reconnectAttempt);
    this.reconnectAttempt += 1;
    window.setTimeout(() => this.openSocket(), delay);
  }

  private fallback(): void {
    this.setState("polling_fallback");
  }

  private setState(state: RealtimeConnectionState): void {
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
    default:
      return "Snapshot";
  }
}
