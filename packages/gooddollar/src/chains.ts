/** Celo Alfajores testnet */
export const CELO_ALFAJORES_CHAIN_ID = 44787;

/** Celo mainnet */
export const CELO_MAINNET_CHAIN_ID = 42220;

export type GoodDollarChainProfile = {
  chainId: number;
  name: string;
  /**
   * Default public RPC for browser/dev UX only — not deploy or ops truth.
   * Production stacks should use env-configured RPC (e.g. `RPC_URL`, `CELO_RPC_URL`).
   */
  rpcUrl: string;
};

/** Frontend default profile — Alfajores PREVIEW until operator broadcast completes. */
export const CELO_ALFAJORES: GoodDollarChainProfile = {
  chainId: CELO_ALFAJORES_CHAIN_ID,
  name: "Celo Alfajores",
  rpcUrl: "https://alfajores-forno.celo-testnet.org",
};

/** Frontend default profile — mainnet RPC default only. */
export const CELO_MAINNET: GoodDollarChainProfile = {
  chainId: CELO_MAINNET_CHAIN_ID,
  name: "Celo",
  rpcUrl: "https://forno.celo.org",
};

export function getChainProfile(chainId: number): GoodDollarChainProfile | undefined {
  if (chainId === CELO_ALFAJORES_CHAIN_ID) return CELO_ALFAJORES;
  if (chainId === CELO_MAINNET_CHAIN_ID) return CELO_MAINNET;
  return undefined;
}
