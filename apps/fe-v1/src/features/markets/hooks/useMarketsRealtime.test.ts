import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { realtimeStateLabel } from "@retropick/polymarket";

const mockClient = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  onMessage: vi.fn(() => vi.fn()),
  onState: vi.fn(() => vi.fn()),
  setBackgrounded: vi.fn(),
  resumeIfNeeded: vi.fn(),
};

vi.mock("@retropick/polymarket", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@retropick/polymarket")>();
  return {
    ...actual,
    createMarketsRealtimeClient: vi.fn(() => mockClient),
  };
});

vi.mock("@/lib/runtimeEnv", () => ({
  getApiBaseUrl: () => "http://api.test",
}));

describe("realtimeStateLabel", () => {
  it("returns honest labels", () => {
    expect(realtimeStateLabel("live")).toBe("Live");
    expect(realtimeStateLabel("snapshot_wait")).toBe("Snapshot");
    expect(realtimeStateLabel("connecting")).toBe("Reconnecting");
    expect(realtimeStateLabel("resyncing")).toBe("Resynchronizing");
    expect(realtimeStateLabel("polling_fallback")).toBe("Realtime unavailable");
  });
});

describe("useMarketsRealtime lifecycle", () => {
  let stateHandler: ((state: string) => void) | null = null;
  let messageHandler: ((envelope: { eventType: string; payload: unknown }) => void) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    stateHandler = null;
    messageHandler = null;
    mockClient.onState.mockImplementation((handler: (state: string) => void) => {
      stateHandler = handler;
      return vi.fn();
    });
    mockClient.onMessage.mockImplementation((handler: (envelope: { eventType: string; payload: unknown }) => void) => {
      messageHandler = handler;
      return vi.fn();
    });
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("defaults to polling when realtime capability is off", async () => {
    const { useMarketsRealtime } = await import("./useMarketsRealtime");
    const { result } = renderHook(() =>
      useMarketsRealtime({
        marketId: "market-1",
        tokenId: "token-yes",
        enabled: true,
        realtimeCapability: false,
      }),
    );

    expect(result.current.pollingOnly).toBe(true);
    expect(result.current.label).toBe("Snapshot polling — not realtime");
    expect(mockClient.connect).not.toHaveBeenCalled();
  });

  it("clears snapshot and enables polling when leaving live state", async () => {
    const { useMarketsRealtime } = await import("./useMarketsRealtime");
    const { result } = renderHook(() =>
      useMarketsRealtime({
        marketId: "market-1",
        tokenId: "token-yes",
        enabled: true,
        realtimeCapability: true,
      }),
    );

    expect(mockClient.connect).toHaveBeenCalledWith("market-1", "token-yes");

    act(() => {
      stateHandler?.("live");
      messageHandler?.({
        eventType: "orderbook.snapshot",
        payload: { hash: "hash-1" },
      });
    });

    await waitFor(() => {
      expect(result.current.snapshot).toEqual({ hash: "hash-1" });
      expect(result.current.pollingOnly).toBe(false);
      expect(result.current.label).toBe("Live");
    });

    act(() => {
      stateHandler?.("resyncing");
    });

    await waitFor(() => {
      expect(result.current.snapshot).toBeNull();
      expect(result.current.pollingOnly).toBe(true);
      expect(result.current.label).toBe("Resynchronizing");
    });
  });

  it("updates from delta only while live and ignores delta before snapshot", async () => {
    const { useMarketsRealtime } = await import("./useMarketsRealtime");
    const { result } = renderHook(() =>
      useMarketsRealtime({
        marketId: "market-1",
        tokenId: "token-yes",
        enabled: true,
        realtimeCapability: true,
      }),
    );

    act(() => {
      stateHandler?.("snapshot_wait");
      messageHandler?.({
        eventType: "orderbook.delta",
        payload: { hash: "delta-too-early" },
      });
    });

    expect(result.current.snapshot).toBeNull();

    act(() => {
      stateHandler?.("live");
      messageHandler?.({
        eventType: "orderbook.delta",
        payload: { hash: "delta-live" },
      });
    });

    await waitFor(() => {
      expect(result.current.snapshot).toEqual({ hash: "delta-live" });
    });
  });

  it("reconnects on visibility return when still enabled", async () => {
    const { useMarketsRealtime } = await import("./useMarketsRealtime");
    renderHook(() =>
      useMarketsRealtime({
        marketId: "market-1",
        tokenId: "token-yes",
        enabled: true,
        realtimeCapability: true,
      }),
    );

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(mockClient.setBackgrounded).toHaveBeenCalledWith(true);

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(mockClient.setBackgrounded).toHaveBeenCalledWith(false);
    expect(mockClient.resumeIfNeeded).toHaveBeenCalled();
  });

  it("disconnects and falls back when capability transitions off", async () => {
    const { useMarketsRealtime } = await import("./useMarketsRealtime");
    const { result, rerender } = renderHook(
      (props: { realtimeCapability: boolean }) =>
        useMarketsRealtime({
          marketId: "market-1",
          tokenId: "token-yes",
          enabled: true,
          realtimeCapability: props.realtimeCapability,
        }),
      { initialProps: { realtimeCapability: true } },
    );

    act(() => {
      stateHandler?.("live");
      messageHandler?.({
        eventType: "orderbook.snapshot",
        payload: { hash: "hash-1" },
      });
    });

    rerender({ realtimeCapability: false });

    await waitFor(() => {
      expect(mockClient.disconnect).toHaveBeenCalled();
      expect(result.current.pollingOnly).toBe(true);
      expect(result.current.snapshot).toBeNull();
      expect(result.current.label).toBe("Snapshot polling — not realtime");
    });
  });

  it("disconnects previous client on token switch", async () => {
    const { useMarketsRealtime } = await import("./useMarketsRealtime");
    const { rerender } = renderHook(
      (props: { tokenId: string }) =>
        useMarketsRealtime({
          marketId: "market-1",
          tokenId: props.tokenId,
          enabled: true,
          realtimeCapability: true,
        }),
      { initialProps: { tokenId: "token-yes" } },
    );

    rerender({ tokenId: "token-no" });

    expect(mockClient.disconnect).toHaveBeenCalled();
    expect(mockClient.connect).toHaveBeenLastCalledWith("market-1", "token-no");
  });
});
