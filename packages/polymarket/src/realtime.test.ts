import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  MarketsRealtimeClient,
  REALTIME_SCHEMA_VERSION,
  type RealtimeEnvelope,
  type RealtimeEventType,
} from "./realtime";

const MARKET_ID = "market-1";
const TOKEN_ID = "token-yes";

type MessageListener = (event: { data: string }) => void;

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readonly url: string;
  readyState = MockWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onmessage: MessageListener | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  readonly sent: string[] = [];

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.();
  }

  simulateOpen(): void {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
  }

  simulateMessage(payload: unknown): void {
    this.onmessage?.({ data: JSON.stringify(payload) });
  }

  simulateError(): void {
    this.onerror?.();
  }

  static reset(): void {
    MockWebSocket.instances = [];
  }

  static latest(): MockWebSocket {
    const socket = MockWebSocket.instances.at(-1);
    if (!socket) throw new Error("no websocket instance");
    return socket;
  }
}

function controlMessage(
  eventType: Extract<RealtimeEventType, "hello" | "subscribed" | "unsubscribed" | "error">,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    schemaVersion: REALTIME_SCHEMA_VERSION,
    eventType,
    marketId: MARKET_ID,
    tokenId: TOKEN_ID,
    sequence: null,
    payload: {},
    ...overrides,
  };
}

function dataMessage(
  eventType: RealtimeEventType,
  overrides: Partial<RealtimeEnvelope> = {},
): RealtimeEnvelope {
  return {
    schemaVersion: REALTIME_SCHEMA_VERSION,
    eventId: "event-1",
    eventType,
    source: "retropick",
    marketId: MARKET_ID,
    upstreamId: TOKEN_ID,
    tokenId: TOKEN_ID,
    sequence: null,
    streamEpoch: 1,
    deliveryCounter: 1,
    observedAt: "2026-07-30T07:00:00.000Z",
    publishedAt: "2026-07-30T07:00:00.100Z",
    payload: { hash: "hash-1" },
    ...overrides,
  };
}

describe("MarketsRealtimeClient recovery lifecycle", () => {
  let scheduled: Array<{ fn: () => void; delay: number }>;
  let randomValue = 0;

  beforeEach(() => {
    vi.useFakeTimers();
    scheduled = [];
    randomValue = 0;
    MockWebSocket.reset();
    vi.stubGlobal(
      "WebSocket",
      MockWebSocket as unknown as typeof WebSocket,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function createClient(reconnectMinMs = 1000, reconnectMaxMs = 30000): MarketsRealtimeClient {
    return new MarketsRealtimeClient({
      baseUrl: "http://api.test",
      reconnectMinMs,
      reconnectMaxMs,
      scheduleImpl: (fn, delay) => {
        scheduled.push({ fn, delay });
        return setTimeout(fn, delay) as unknown as ReturnType<typeof globalThis.setTimeout>;
      },
      randomImpl: () => randomValue,
    });
  }

  function flushLatestReconnect(): void {
    const pending = scheduled.at(-1);
    if (!pending) throw new Error("no reconnect scheduled");
    pending.fn();
  }

  it("rejects malformed and invalid envelopes", () => {
    const client = createClient();
    const states: string[] = [];
    const messages: RealtimeEnvelope[] = [];
    client.onState((state) => states.push(state));
    client.onMessage((envelope) => messages.push(envelope));
    client.connect(MARKET_ID, TOKEN_ID);
    const socket = MockWebSocket.latest();
    socket.simulateOpen();

    socket.simulateMessage("not-json");
    socket.simulateMessage({ schemaVersion: "2", eventType: "orderbook.snapshot" });
    socket.simulateMessage(dataMessage("orderbook.snapshot", { sequence: "1" as unknown as null }));
    socket.simulateMessage(dataMessage("orderbook.snapshot", { marketId: "other-market" }));
    socket.simulateMessage(dataMessage("orderbook.snapshot", { tokenId: "other-token" }));

    expect(messages).toHaveLength(0);
    expect(states).toContain("snapshot_wait");
    expect(states).not.toContain("live");
  });

  it("waits for snapshot before live and treats delta as non-snapshot bootstrap", () => {
    const client = createClient();
    const states: string[] = [];
    const messages: RealtimeEnvelope[] = [];
    client.onState((state) => states.push(state));
    client.onMessage((envelope) => messages.push(envelope));
    client.connect(MARKET_ID, TOKEN_ID);
    const socket = MockWebSocket.latest();
    socket.simulateOpen();

    socket.simulateMessage(dataMessage("orderbook.delta", { deliveryCounter: 1 }));
    expect(states).not.toContain("live");
    expect(messages).toHaveLength(0);

    socket.simulateMessage(dataMessage("orderbook.snapshot", { deliveryCounter: 1 }));
    expect(states).toContain("live");
    expect(messages).toHaveLength(1);
    expect(messages[0]?.eventType).toBe("orderbook.snapshot");
  });

  it("ignores old epochs and requires snapshot on new epoch", () => {
    const client = createClient();
    const messages: RealtimeEnvelope[] = [];
    client.onMessage((envelope) => messages.push(envelope));
    client.connect(MARKET_ID, TOKEN_ID);
    const socket = MockWebSocket.latest();
    socket.simulateOpen();

    socket.simulateMessage(dataMessage("orderbook.snapshot", { streamEpoch: 2, deliveryCounter: 1 }));
    socket.simulateMessage(dataMessage("orderbook.delta", { streamEpoch: 1, deliveryCounter: 2 }));
    expect(messages).toHaveLength(1);

    socket.simulateMessage(dataMessage("orderbook.delta", { streamEpoch: 3, deliveryCounter: 1 }));
    expect(messages).toHaveLength(1);

    socket.simulateMessage(dataMessage("orderbook.snapshot", { streamEpoch: 3, deliveryCounter: 2 }));
    expect(messages).toHaveLength(2);
  });

  it("recovers actively on resync.required", () => {
    const client = createClient();
    const states: string[] = [];
    client.onState((state) => states.push(state));
    client.connect(MARKET_ID, TOKEN_ID);
    let socket = MockWebSocket.latest();
    socket.simulateOpen();
    socket.simulateMessage(dataMessage("orderbook.snapshot", { streamEpoch: 1, deliveryCounter: 1 }));

    socket.simulateMessage(dataMessage("resync.required", { streamEpoch: 2, deliveryCounter: 0 }));
    expect(states).toContain("resyncing");
    expect(MockWebSocket.instances).toHaveLength(2);
    socket = MockWebSocket.latest();
    socket.simulateOpen();
    expect(JSON.parse(socket.sent[0] ?? "{}")).toMatchObject({
      command: "subscribe",
      marketId: MARKET_ID,
      tokenId: TOKEN_ID,
    });
  });

  it("detects delivery counter gaps and reconnects", () => {
    const client = createClient();
    const states: string[] = [];
    const messages: RealtimeEnvelope[] = [];
    client.onState((state) => states.push(state));
    client.onMessage((envelope) => messages.push(envelope));
    client.connect(MARKET_ID, TOKEN_ID);
    const socket = MockWebSocket.latest();
    socket.simulateOpen();
    socket.simulateMessage(dataMessage("orderbook.snapshot", { streamEpoch: 1, deliveryCounter: 1 }));
    socket.simulateMessage(dataMessage("orderbook.delta", { streamEpoch: 1, deliveryCounter: 3 }));

    expect(states).toContain("resyncing");
    expect(messages).toHaveLength(1);
    expect(MockWebSocket.instances.length).toBeGreaterThan(1);
  });

  it("uses jittered bounded reconnect delays", () => {
    randomValue = 0.5;
    const client = createClient(1000, 5000);
    client.connect(MARKET_ID, TOKEN_ID);
    MockWebSocket.latest().simulateOpen();
    MockWebSocket.latest().close();

    expect(scheduled).toHaveLength(1);
    expect(scheduled[0]?.delay).toBe(1500);

    flushLatestReconnect();
    MockWebSocket.latest().close();

    expect(scheduled.at(-1)?.delay).toBe(2500);
  });

  it("cancels reconnect timers on disconnect and token switch", () => {
    const client = createClient();
    client.connect(MARKET_ID, TOKEN_ID);
    MockWebSocket.latest().simulateOpen();
    MockWebSocket.latest().close();
    expect(scheduled).toHaveLength(1);

    client.disconnect();
    const socketsBeforeTimer = MockWebSocket.instances.length;
    vi.advanceTimersByTime(60_000);
    expect(MockWebSocket.instances.length).toBe(socketsBeforeTimer);

    client.connect(MARKET_ID, "token-no");
    const socket = MockWebSocket.latest();
    socket.simulateOpen();
    expect(JSON.parse(socket.sent[0] ?? "{}")).toMatchObject({
      command: "subscribe",
      tokenId: "token-no",
    });
  });

  it("avoids multiple concurrent sockets during recovery", () => {
    const client = createClient();
    client.connect(MARKET_ID, TOKEN_ID);
    const first = MockWebSocket.latest();
    first.simulateOpen();
    client.connect(MARKET_ID, "token-next");
    expect(MockWebSocket.instances).toHaveLength(2);
    expect(first.readyState).toBe(MockWebSocket.CLOSED);
  });

  it("backgrounds into polling fallback and resumes on foreground", () => {
    const client = createClient();
    const states: string[] = [];
    client.onState((state) => states.push(state));
    client.connect(MARKET_ID, TOKEN_ID);
    MockWebSocket.latest().simulateOpen();
    MockWebSocket.latest().simulateMessage(
      dataMessage("orderbook.snapshot", { streamEpoch: 1, deliveryCounter: 1 }),
    );

    client.setBackgrounded(true);
    expect(states).toContain("polling_fallback");

    client.setBackgrounded(false);
    client.resumeIfNeeded();
    expect(MockWebSocket.instances.length).toBeGreaterThan(1);
    MockWebSocket.latest().simulateOpen();
    expect(JSON.parse(MockWebSocket.latest().sent[0] ?? "{}")).toMatchObject({
      command: "subscribe",
      marketId: MARKET_ID,
      tokenId: TOKEN_ID,
    });
  });

  it("accepts control envelopes without data fields", () => {
    const client = createClient();
    const states: string[] = [];
    client.onState((state) => states.push(state));
    client.connect(MARKET_ID, TOKEN_ID);
    const socket = MockWebSocket.latest();
    socket.simulateOpen();
    socket.simulateMessage(controlMessage("hello"));
    socket.simulateMessage(controlMessage("subscribed"));
    expect(states).toContain("snapshot_wait");
    expect(states).not.toContain("live");
  });

  it("enters polling fallback on control error", () => {
    const client = createClient();
    const states: string[] = [];
    client.onState((state) => states.push(state));
    client.connect(MARKET_ID, TOKEN_ID);
    const socket = MockWebSocket.latest();
    socket.simulateOpen();
    socket.simulateMessage(controlMessage("error", { payload: { code: "bad_subscribe" } }));
    expect(states).toContain("polling_fallback");
    expect(scheduled.length).toBeGreaterThan(0);
  });
});
