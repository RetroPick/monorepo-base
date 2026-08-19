// MARKETS_CUSTODY: Polygon-first Markets wallet chain config

import { polygon, mainnet } from "@reown/appkit/networks";
import type { AppKitNetwork } from "@reown/appkit/networks";

export const POLYGON_CHAIN_ID = 137 as const;
export const ETHEREUM_CHAIN_ID = 1 as const;

export const MARKETS_WALLET_NETWORKS: [AppKitNetwork, ...AppKitNetwork[]] = [polygon, mainnet];

export const MARKETS_DEFAULT_NETWORK = polygon;

export function getMarketsChainLabel(chainId: number): string {
  if (chainId === POLYGON_CHAIN_ID) return "Polygon";
  if (chainId === ETHEREUM_CHAIN_ID) return "Ethereum";
  return `Chain ${chainId}`;
}
