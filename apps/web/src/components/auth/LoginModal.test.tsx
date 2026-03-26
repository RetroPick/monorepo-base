import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import LoginModal from "./LoginModal";

const executeSocialLoginMock = vi.fn();
const openMock = vi.fn();
const toastMock = vi.fn();
const useAppKitAccountMock = vi.fn();

vi.mock("@reown/appkit/react", () => ({
  useAppKit: () => ({ open: openMock }),
  useAppKitAccount: () => useAppKitAccountMock(),
}));

vi.mock("@reown/appkit-controllers/utils", () => ({
  executeSocialLogin: (...args: unknown[]) => executeSocialLoginMock(...args),
}));

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

describe("LoginModal", () => {
  beforeEach(() => {
    executeSocialLoginMock.mockReset();
    openMock.mockReset();
    toastMock.mockReset();
    useAppKitAccountMock.mockReset();

    useAppKitAccountMock.mockReturnValue({
      isConnected: false,
      embeddedWalletInfo: undefined,
    });
  });

  it("starts AppKit Google social login when the Google CTA is clicked", async () => {
    executeSocialLoginMock.mockResolvedValue(undefined);

    render(<LoginModal isOpen onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));

    await waitFor(() => {
      expect(executeSocialLoginMock).toHaveBeenCalledWith("google");
    });
  });

  it("surfaces an error toast when Google social login setup fails", async () => {
    executeSocialLoginMock.mockRejectedValue(new Error("Popup blocked"));

    render(<LoginModal isOpen onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Google sign-in failed",
          description: "Popup blocked",
          variant: "destructive",
        }),
      );
    });
  });
});
