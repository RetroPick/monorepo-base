import { CELO_ALFAJORES_CHAIN_ID, CELO_MAINNET_CHAIN_ID } from "./chains";

export type GUSDTokenConfig = {
  address: `0x${string}`;
  symbol: string;
  decimals: number;
};

/**
 * Relative path to Alfajores registry from monorepo root.
 * Deployed stake token address in `packages/contracts/registry.celo-alfajores.json`
 * is the source of truth — tests assert this map stays aligned.
 */
export const ALFAJORES_REGISTRY_PATH = "packages/contracts/registry.celo-alfajores.json";

/**
 * Known G$ token metadata for supported chains.
 * Alfajores address must match registry `contracts.stakeToken` (see registry drift test).
 * Mainnet address is documented reference only until mainnet registry entry exists.
 */
export const GUSD_TOKENS: Record<number, GUSDTokenConfig> = {
  [CELO_MAINNET_CHAIN_ID]: {
    address: "0x62B8B11039fcfE5AB0C56E502b1C372A3D2a9C7A",
    symbol: "G$",
    decimals: 18,
  },
  [CELO_ALFAJORES_CHAIN_ID]: {
    address: "0xFa51eFDc0910CCdA91732e6806912Fa12e2FD475",
    symbol: "G$",
    decimals: 18,
  },
};

export function getGUSDToken(chainId: number): GUSDTokenConfig | undefined {
  return GUSD_TOKENS[chainId];
}
