import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import LoginModal from "./LoginModal";

const connectWalletMock = vi.fn();
const openAppKitMock = vi.fn();
const executeSocialLoginMock = vi.fn();
const toastMock = vi.fn();
const useAccountMock = vi.fn();

vi.mock("wagmi", () => ({
  useAccount: () => useAccountMock(),
}));

vi.mock("@reown/appkit/react", () => ({
  useAppKit: () => ({
    open: (...args: unknown[]) => openAppKitMock(...args),
  }),
}));

vi.mock("@reown/appkit-controllers/utils", () => ({
  executeSocialLogin: (...args: unknown[]) => executeSocialLoginMock(...args),
}));

vi.mock("@/hooks/useWalletConnection", () => ({
  useWalletConnection: () => ({
    connectWallet: (...args: unknown[]) => connectWalletMock(...args),
    isPending: false,
    pendingConnector: undefined,
    walletOptions: [
      {
        label: "Coinbase Wallet",
        connector: { id: "coinbaseWalletSDK", name: "Coinbase Wallet" },
      },
      {
        label: "Browser Wallet",
        connector: { id: "injected", name: "Injected" },
      },
    ],
  }),
}));

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

describe("LoginModal", () => {
  beforeEach(() => {
    connectWalletMock.mockReset();
    openAppKitMock.mockReset();
    executeSocialLoginMock.mockReset();
    toastMock.mockReset();
    useAccountMock.mockReset();

    useAccountMock.mockReturnValue({
      isConnected: false,
    });
  });

  it("starts Coinbase Wallet when its tile is clicked", async () => {
    connectWalletMock.mockResolvedValue(undefined);

    render(<LoginModal isOpen onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /coinbase wallet/i }));

    await waitFor(() => {
      expect(connectWalletMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: "coinbaseWalletSDK" }),
      );
    });
  });

  it("starts Google social login from the account abstraction tile", async () => {
    executeSocialLoginMock.mockResolvedValue(undefined);

    render(<LoginModal isOpen onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /google/i }));

    await waitFor(() => {
      expect(executeSocialLoginMock).toHaveBeenCalledWith("google");
    });
  });

  it("surfaces an error toast when wallet setup fails", async () => {
    connectWalletMock.mockRejectedValue(new Error("Popup blocked"));

    render(<LoginModal isOpen onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /coinbase wallet/i }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Wallet connection failed",
          description: "Popup blocked",
          variant: "destructive",
        }),
      );
    });
  });
});
