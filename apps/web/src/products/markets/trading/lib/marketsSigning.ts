export type MarketsTypedData = Record<string, unknown>;
export type MarketsTypedDataSigner = (typedData: MarketsTypedData) => Promise<`0x${string}`>;

/**
 * The injected signer exists only for Playwright's separately built E2E server.
 * Production builds never enable this flag, so browser globals cannot bypass the
 * wallet signature boundary.
 */
export function resolveMarketsTypedDataSigner(
  walletSigner: MarketsTypedDataSigner,
  e2eSignature: `0x${string}` | undefined,
): MarketsTypedDataSigner {
  if (process.env.NEXT_PUBLIC_MARKETS_E2E_TEST_MODE === "1" && e2eSignature) {
    return async () => e2eSignature;
  }

  return walletSigner;
}
