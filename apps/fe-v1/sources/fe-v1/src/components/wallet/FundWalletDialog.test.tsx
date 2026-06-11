import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import FundWalletDialog from "./FundWalletDialog";

const qrToDataUrlMock = vi.fn();
const appKitOpenMock = vi.fn();
const exchangeOpenMock = vi.fn();
const toastMock = vi.fn();
const switchChainAsyncMock = vi.fn();
const writeContractAsyncMock = vi.fn();

vi.mock("qrcode", () => ({
  default: {
    toDataURL: (...args: unknown[]) => qrToDataUrlMock(...args),
  },
}));

vi.mock("@reown/appkit/react", () => ({
  useAppKit: () => ({ open: appKitOpenMock }),
}));

vi.mock("@reown/appkit-pay/react", () => ({
  usePay: () => ({
    open: exchangeOpenMock,
    isPending: false,
  }),
}));

vi.mock("@reown/appkit-pay", () => ({
  baseETH: { network: "eip155:8453", asset: "native", metadata: { name: "Ether", symbol: "ETH", decimals: 18 } },
  baseSepoliaETH: { network: "eip155:84532", asset: "native", metadata: { name: "Ether", symbol: "ETH", decimals: 18 } },
  baseUSDC: { network: "eip155:8453", asset: "0xbaseusdc", metadata: { name: "USD Coin", symbol: "USDC", decimals: 6 } },
  arbitrumUSDC: { network: "eip155:42161", asset: "0xarbusdc", metadata: { name: "USD Coin", symbol: "USDC", decimals: 6 } },
  arbitrumUSDT: { network: "eip155:42161", asset: "0xarbusdt", metadata: { name: "Tether", symbol: "USDT", decimals: 6 } },
  ethereumUSDC: { network: "eip155:1", asset: "0xethusdc", metadata: { name: "USD Coin", symbol: "USDC", decimals: 6 } },
  ethereumUSDT: { network: "eip155:1", asset: "0xethusdt", metadata: { name: "Tether", symbol: "USDT", decimals: 6 } },
}));

vi.mock("wagmi", () => ({
  useAccount: () => ({ chainId: 43113 }),
  useSwitchChain: () => ({ switchChainAsync: switchChainAsyncMock, isPending: false }),
  useWriteContract: () => ({
    writeContractAsync: writeContractAsyncMock,
    data: undefined,
    isPending: false,
  }),
  useWaitForTransactionReceipt: () => ({
    isLoading: false,
    isSuccess: false,
  }),
}));

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

describe("FundWalletDialog", () => {
  beforeEach(() => {
    qrToDataUrlMock.mockReset();
    qrToDataUrlMock.mockResolvedValue("data:image/png;base64,qr");
    appKitOpenMock.mockReset();
    appKitOpenMock.mockResolvedValue(undefined);
    exchangeOpenMock.mockReset();
    exchangeOpenMock.mockResolvedValue(undefined);
    toastMock.mockReset();
    switchChainAsyncMock.mockReset();
    switchChainAsyncMock.mockResolvedValue(undefined);
    writeContractAsyncMock.mockReset();
    writeContractAsyncMock.mockResolvedValue("0xhash");
  });

  it("opens Reown on-ramp providers", async () => {
    render(<FundWalletDialog address="0x1234567890abcdef" isOpen onOpenChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /buy with card \/ bank/i }));

    await waitFor(() => {
      expect(appKitOpenMock).toHaveBeenCalledWith({ view: "OnRampProviders" });
    });
  });

  it("opens exchange deposit for the connected wallet address", async () => {
    render(<FundWalletDialog address="0x1234567890abcdef" isOpen onOpenChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /deposit from exchange/i }));

    await waitFor(() => {
      expect(exchangeOpenMock).toHaveBeenCalledWith(
        expect.objectContaining({
          choice: "deposit",
          amount: 100,
          recipient: "0x1234567890abcdef",
          openInNewTab: true,
        }),
      );
    });
  });

  it("claims Fuji faucet funds when already on Fuji", async () => {
    render(<FundWalletDialog address="0x1234567890abcdef" isOpen onOpenChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /claim avalanche fuji test usdc/i }));

    await waitFor(() => {
      expect(writeContractAsyncMock).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: "claim",
        }),
      );
    });
    expect(switchChainAsyncMock).not.toHaveBeenCalled();
  });
});
