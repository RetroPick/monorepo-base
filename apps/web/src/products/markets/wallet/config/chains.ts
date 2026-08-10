// MARKETS_CUSTODY: ADR-003 — Polygon-only Markets wallet chain config (no T4 storage)

import { polygon } from "@reown/appkit/networks";
import type { AppKitNetwork } from "@reown/appkit/networks";

export const POLYGON_CHAIN_ID = 137 as const;

export const MARKETS_WALLET_NETWORKS: [AppKitNetwork, ...AppKitNetwork[]] = [polygon];

export const MARKETS_DEFAULT_NETWORK = polygon;

export function getMarketsChainLabel(chainId: number): string {
  if (chainId === POLYGON_CHAIN_ID) return "Polygon";
  return `Chain ${chainId}`;
}
