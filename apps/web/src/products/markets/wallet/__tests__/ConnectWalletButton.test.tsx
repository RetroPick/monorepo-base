import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { useMarketsWalletConnect } from "../hooks/useMarketsWalletConnect";
import { ConnectWalletButton } from "../components/ConnectWalletButton";

vi.mock("../hooks/useMarketsWalletConnect", () => ({
  useMarketsWalletConnect: vi.fn(),
}));

describe("ConnectWalletButton", () => {
  const connect = vi.fn();

  beforeEach(() => {
    connect.mockReset();
    vi.mocked(useMarketsWalletConnect).mockReturnValue({
      address: undefined,
      chainId: undefined,
      isConnected: false,
      isConnecting: false,
      connectError: null,
      connect,
      disconnect: vi.fn(),
    });
  });

  it("calls connect when clicked", () => {
    render(<ConnectWalletButton />);
    fireEvent.click(screen.getByRole("button", { name: /connect wallet/i }));
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it("shows connect error when present", () => {
    vi.mocked(useMarketsWalletConnect).mockReturnValue({
      address: undefined,
      chainId: undefined,
      isConnected: false,
      isConnecting: false,
      connectError: "User rejected",
      connect,
      disconnect: vi.fn(),
    });
    render(<ConnectWalletButton />);
    expect(screen.getByRole("alert")).toHaveTextContent("User rejected");
  });
});
