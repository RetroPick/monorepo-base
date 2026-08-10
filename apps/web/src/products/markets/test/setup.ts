import "@testing-library/jest-dom";
import { vi } from "vitest";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

vi.mock("@/products/markets/wallet/hooks/useMarketsWalletConnect", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/products/markets/wallet/hooks/useMarketsWalletConnect")>();
  return {
    ...actual,
    useMarketsWalletConnect: () => ({
      address: undefined,
      chainId: undefined,
      isConnected: false,
      isConnecting: false,
      connectError: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
    }),
  };
});
