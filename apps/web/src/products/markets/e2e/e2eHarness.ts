/** Playwright-only harness bridge — activated via window.__MARKETS_E2E__ before app load. */

export type MarketsE2EWallet = {
  connected: boolean;
  address: string;
  chainId: number;
};

export type MarketsE2ESession = {
  wallet: string;
  expiresAt: string;
};

export type MarketsE2EHarness = {
  wallet?: MarketsE2EWallet;
  session?: MarketsE2ESession;
  signSignature?: `0x${string}`;
};

declare global {
  interface Window {
    __MARKETS_E2E__?: MarketsE2EHarness;
  }
}

export function readMarketsE2EHarness(): MarketsE2EHarness | undefined {
  if (typeof window === "undefined" || process.env.NEXT_PUBLIC_MARKETS_E2E_TEST_MODE !== "1") {
    return undefined;
  }
  return window.__MARKETS_E2E__;
}
