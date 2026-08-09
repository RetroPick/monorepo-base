import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import ChainMarkets from "./ChainMarkets";

vi.mock("@/components/Header", () => ({
  default: () => <div data-testid="header" />,
}));

vi.mock("@/components/Footer", () => ({
  default: () => <div data-testid="footer" />,
}));

vi.mock("@/hooks/useIndexerWebSocket", () => ({
  useIndexerWebSocket: vi.fn(),
}));

vi.mock("@/lib/api/retropickApi", () => ({
  fetchHealth: vi.fn(async () => ({
    ok: true,
    lastIndexedBlock: 40714576,
    lastSyncAt: "2026-04-25T11:12:34Z",
  })),
  fetchMarkets: vi.fn(async () => [
    {
      templateId: "0xactive",
      slug: "btc-direction",
      marketType: 0,
      outcomeCount: 2,
      initialized: true,
      published: true,
      executionMode: 0,
      rollingPhase: 0,
      rollingHaltReason: 0,
      lastIndexedBlock: 40714576,
      lastIndexedAt: "2026-04-25T11:12:34Z",
      activeEpochId: 1,
    },
    {
      templateId: "0xinactive",
      slug: "eth-threshold",
      marketType: 1,
      outcomeCount: 2,
      initialized: true,
      published: false,
      executionMode: 0,
      rollingPhase: 0,
      rollingHaltReason: 0,
      lastIndexedBlock: 40714576,
      lastIndexedAt: "2026-04-25T11:12:34Z",
    },
  ]),
  getApiBaseUrl: () => "http://127.0.0.1:8080",
}));

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ChainMarkets />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ChainMarkets", () => {
  it("shows published markets with active epochs by default", async () => {
    renderPage();

    expect(await screen.findByText("btc-direction")).toBeInTheDocument();
    expect(screen.getByText("Active epoch #1")).toBeInTheDocument();
    expect(screen.queryByText("eth-threshold")).not.toBeInTheDocument();
    expect(screen.getByText("1 active epoch · 2 indexed templates")).toBeInTheDocument();
  });

  it("can switch to all indexed templates", async () => {
    renderPage();

    await screen.findByText("btc-direction");
    fireEvent.click(screen.getByRole("button", { name: "All indexed" }));

    await waitFor(() => {
      expect(screen.getByText("eth-threshold")).toBeInTheDocument();
    });
    expect(screen.getByText("Published · no active epoch")).toBeInTheDocument();
  });
});
