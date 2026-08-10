import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mockUseMarketsWalletSession = vi.fn();

vi.mock("wagmi", () => ({
  useAccount: () => ({
    address: "0x1234567890abcdef1234567890abcdef12345678",
    isConnected: true,
    chainId: 137,
  }),
  useDisconnect: () => ({ disconnect: vi.fn() }),
  useSignMessage: () => ({ signMessageAsync: vi.fn() }),
}));

vi.mock("../hooks/useMarketsWalletConnect", () => ({
  useMarketsWalletConnect: () => ({
    address: "0x1234567890abcdef1234567890abcdef12345678",
    chainId: 137,
    isConnected: true,
    disconnect: vi.fn(),
  }),
}));

vi.mock("../hooks/useMarketsWalletSession", () => ({
  useMarketsWalletSession: () => mockUseMarketsWalletSession(),
}));

vi.mock("../hooks/useMarketsTradingWallets", () => ({
  useMarketsTradingWallets: () => ({
    accountWallet: undefined,
    state: "idle",
  }),
}));

import { WalletAddressDisclosure } from "../components/WalletAddressDisclosure";

describe("WalletAddressDisclosure", () => {
  beforeEach(() => {
    mockUseMarketsWalletSession.mockReturnValue({
      sessionState: "idle",
      sessionError: null,
      isSessionAuthenticated: false,
      isRestoring: false,
      authenticate: vi.fn(),
      logout: vi.fn(),
    });
  });

  it("shows signer distinct from trading address placeholder", () => {
    render(<WalletAddressDisclosure />);
    expect(screen.getByText(/Signer:/)).toBeInTheDocument();
    expect(screen.getByText(/Trading address:/)).toBeInTheDocument();
    expect(screen.getByText(/Linked after account setup/)).toBeInTheDocument();
  });

  it("shows linked account wallet when provided", () => {
    render(<WalletAddressDisclosure accountWallet="0xabcdefabcdefabcdefabcdefabcdefabcdefabcd" />);
    expect(screen.getByText(/0xabcd/)).toBeInTheDocument();
  });

  it("shows sign out and session active when authenticated", () => {
    mockUseMarketsWalletSession.mockReturnValue({
      sessionState: "authenticated",
      sessionError: null,
      isSessionAuthenticated: true,
      isRestoring: false,
      authenticate: vi.fn(),
      logout: vi.fn(),
    });
    render(<WalletAddressDisclosure />);
    expect(screen.getByText(/Markets session active/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
  });
});
