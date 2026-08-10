import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const mockSession = vi.fn();
const mockConnect = vi.fn();
const mockPreview = vi.fn();
const mockRelay = vi.fn();

vi.mock("../../wallet/hooks/useMarketsWalletSession", () => ({
  useMarketsWalletSession: () => mockSession(),
}));

vi.mock("../../wallet/hooks/useMarketsWalletConnect", () => ({
  useMarketsWalletConnect: () => mockConnect(),
}));

vi.mock("../../wallet/config/runtimeEnv", () => ({
  getMarketsApiOrigin: () => "http://localhost:8080",
}));

vi.mock("../config/features", () => ({
  isAccountWalletCreateEnabled: vi.fn(),
  POLYGON_CHAIN_ID: 137,
}));

vi.mock("../lib/fundingApiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/fundingApiClient")>();
  return {
    ...actual,
    previewAccountWallet: (...args: unknown[]) => mockPreview(...args),
    relayAccountWallet: (...args: unknown[]) => mockRelay(...args),
  };
});

import { isAccountWalletCreateEnabled } from "../config/features";
import { FundingApiError } from "../lib/fundingApiClient";
import { useDepositWalletSetup } from "../hooks/useDepositWalletSetup";

const DEPLOYED_WALLET = "0xcccccccccccccccccccccccccccccccccccccccc";

const openApiPreview = {
  schemaVersion: "1",
  signerAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  action: "deploy_deposit_wallet" as const,
  chainId: 137,
  message: "Sign and deploy Deposit Wallet via upstream relayer; BFF persists the deployed address on relay.",
};

describe("useDepositWalletSetup", () => {
  beforeEach(() => {
    mockSession.mockReturnValue({ isSessionAuthenticated: true });
    mockConnect.mockReturnValue({
      isConnected: true,
      chainId: 137,
    });
    mockPreview.mockReset();
    mockRelay.mockReset();
    vi.mocked(isAccountWalletCreateEnabled).mockReturnValue(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("starts unavailable when feature flag is off", () => {
    const { result } = renderHook(() => useDepositWalletSetup());
    expect(result.current.state).toBe("unavailable");
    expect(result.current.createEnabled).toBe(false);
  });

  it("maps preview 501 to unavailable", async () => {
    vi.mocked(isAccountWalletCreateEnabled).mockReturnValue(true);
    mockPreview.mockRejectedValue(new FundingApiError("unavailable", "not wired", 501));

    const { result } = renderHook(() => useDepositWalletSetup());

    await waitFor(() => {
      void result.current.startPreview();
    });

    await waitFor(() => {
      expect(result.current.state).toBe("unavailable");
    });
  });

  it("errors when deploy callback is missing", async () => {
    vi.mocked(isAccountWalletCreateEnabled).mockReturnValue(true);
    mockPreview.mockResolvedValue(openApiPreview);

    const { result } = renderHook(() => useDepositWalletSetup());

    await waitFor(() => {
      void result.current.startPreview();
    });

    await waitFor(() => {
      expect(result.current.state).toBe("awaiting_wallet");
    });

    await waitFor(() => {
      void result.current.confirmAndSign();
    });

    await waitFor(() => {
      expect(result.current.state).toBe("error");
    });
    expect(result.current.errorMessage).toMatch(/not available in this client build/i);
    expect(mockRelay).not.toHaveBeenCalled();
  });

  it("completes linked flow when preview, deploy, and relay succeed", async () => {
    vi.mocked(isAccountWalletCreateEnabled).mockReturnValue(true);
    mockPreview.mockResolvedValue(openApiPreview);
    mockRelay.mockResolvedValue({
      schemaVersion: "1",
      signerAddress: openApiPreview.signerAddress,
      wallet: {
        accountWallet: DEPLOYED_WALLET,
        walletType: "DEPOSIT_WALLET",
        linkStatus: "linked",
        isPrimary: true,
        chainId: 137,
      },
    });

    const onLinked = vi.fn();
    const deployDepositWallet = vi.fn().mockResolvedValue({ accountWallet: DEPLOYED_WALLET });
    const { result } = renderHook(() =>
      useDepositWalletSetup({ onLinked, deployDepositWallet }),
    );

    await waitFor(() => {
      void result.current.startPreview();
    });

    await waitFor(() => {
      expect(result.current.state).toBe("awaiting_wallet");
    });
    expect(mockPreview).toHaveBeenCalledWith({ action: "deploy_deposit_wallet" });

    await waitFor(() => {
      void result.current.confirmAndSign();
    });

    await waitFor(() => {
      expect(result.current.state).toBe("linked");
    });
    expect(deployDepositWallet).toHaveBeenCalled();
    expect(mockRelay).toHaveBeenCalledWith({
      accountWallet: DEPLOYED_WALLET,
      chainId: 137,
    });
    expect(result.current.linkedAccountWallet).toBe(DEPLOYED_WALLET);
    expect(onLinked).toHaveBeenCalledWith(DEPLOYED_WALLET);
  });
});
