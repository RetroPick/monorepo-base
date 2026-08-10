import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { ComponentProps } from "react";

import { OrderTicketPanel } from "../components/OrderTicketPanel";
import { sampleMarketDetail } from "../../fixtures/openapi-examples";

const previewOrderMock = vi.fn();
const submitOrderMock = vi.fn();

vi.mock("../lib/tradingApiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/tradingApiClient")>();
  return {
    ...actual,
    previewOrder: (...args: unknown[]) => previewOrderMock(...args),
    submitOrder: (...args: unknown[]) => submitOrderMock(...args),
  };
});

vi.mock("../../wallet/hooks/useMarketsWalletSession", () => ({
  useMarketsWalletSession: () => ({
    isSessionAuthenticated: true,
    sessionState: "authenticated",
  }),
}));

vi.mock("../../wallet/hooks/useMarketsWalletConnect", () => ({
  useMarketsWalletConnect: () => ({
    isConnected: true,
    chainId: 137,
  }),
}));

vi.mock("../../wallet/hooks/useMarketsTradingWallets", () => ({
  useMarketsTradingWallets: () => ({
    accountWallet: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    state: "loaded",
  }),
}));

vi.mock("../../hooks/useMarketsQueries", () => ({
  useMarketsCapabilities: () => ({
    data: { features: { order_submit: false } },
  }),
}));

vi.mock("../../api/marketsClient", () => ({
  getMarketsClient: () => ({
    getEligibility: () =>
      Promise.resolve({
        data: { eligible: true, reason: null },
        status: 200,
        notModified: false,
      }),
  }),
}));

vi.mock("../../wallet/config/runtimeEnv", () => ({
  getMarketsApiOrigin: () => "http://127.0.0.1:8080",
}));

vi.mock("wagmi", () => ({
  useSignTypedData: () => ({
    signTypedDataAsync: vi.fn().mockResolvedValue(`0x${"aa".repeat(65)}`),
    isPending: false,
  }),
}));

const freshBook = {
  schemaVersion: "1",
  marketId: sampleMarketDetail.id,
  tokenId: "token-yes",
  bids: [{ price: "0.41", size: "100" }],
  asks: [{ price: "0.43", size: "50" }],
  spread: "0.02",
  freshness: { state: "fresh" as const, observedAt: "2026-07-30T12:00:00Z", ageMillis: 1000 },
  timestamp: "2026-07-30T12:00:00Z",
};

function renderTicket(overrides?: Partial<ComponentProps<typeof OrderTicketPanel>>) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <OrderTicketPanel
        market={sampleMarketDetail}
        tokenId="token-yes"
        outcomeName="Yes"
        orderBook={freshBook}
        {...overrides}
      />
    </QueryClientProvider>,
  );
}

describe("OrderTicketPanel", () => {
  beforeEach(() => {
    previewOrderMock.mockReset();
    submitOrderMock.mockReset();
    previewOrderMock.mockResolvedValue({
      schemaVersion: "1",
      previewId: "preview-1",
      contentHash: "0x8ff5b36b12c7cb42f697de3936d80c5fb9e965e46fd05c85d35f822f2e43b1ff",
      expiresAt: "2026-08-09T12:05:00Z",
      humanSummary: {
        action: "BUY",
        market: "Will A happen?",
        outcome: "Yes",
        size: "100 USDC",
        price: "0.42",
        estimatedFee: "0.10 USDC",
        chainId: 137,
      },
      unsignedPayload: {
        salt: "4242424242424242",
        maker: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        signer: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        tokenId: "token-yes",
        makerAmount: "100000000",
        takerAmount: "42000000",
        side: 0,
        signatureType: 0,
        timestamp: "1710000000000",
        metadata: "",
        builder: "0000000000000000000000000000000000000000000000000000000000000001",
      },
      exchangeDomain: "standard",
    });
  });

  it("renders order ticket and submission unavailable when order_submit false", () => {
    renderTicket();
    expect(screen.getByLabelText(/order ticket/i)).toBeInTheDocument();
    expect(screen.getByText(/order submission unavailable/i)).toBeInTheDocument();
  });

  it("disables preview for marketable price on stale book", () => {
    const staleBook = {
      ...freshBook,
      freshness: { state: "stale" as const, observedAt: "2026-07-30T12:00:00Z", ageMillis: 9000 },
    };
    renderTicket({ orderBook: staleBook });
    fireEvent.change(screen.getByPlaceholderText("0.42"), { target: { value: "0.43" } });
    fireEvent.change(screen.getByPlaceholderText("USDC amount"), { target: { value: "100" } });
    expect(screen.getByRole("button", { name: /preview order/i })).toBeDisabled();
    expect(screen.getByText(/stale book/i)).toBeInTheDocument();
  });

  it("opens preview modal with fee disclosure after successful preview", async () => {
    renderTicket();
    fireEvent.change(screen.getByPlaceholderText("0.42"), { target: { value: "0.42" } });
    fireEvent.change(screen.getByPlaceholderText("USDC amount"), { target: { value: "100" } });
    fireEvent.click(screen.getByRole("button", { name: /preview order/i }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
    expect(screen.getByText(/maximum loss/i)).toBeInTheDocument();
    expect(screen.getByText(/0\.10 USDC/)).toBeInTheDocument();
    expect(previewOrderMock).toHaveBeenCalledTimes(1);
    expect(submitOrderMock).not.toHaveBeenCalled();
  });
});
