// MARKETS_CUSTODY: feature flags only — no secrets

import { POLYGON_CHAIN_ID } from "../../wallet/config/chains";

export { POLYGON_CHAIN_ID };

export function isAccountWalletCreateEnabled(): boolean {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_MARKETS_ACCOUNT_WALLET_CREATE === "1") {
    return true;
  }
  return false;
}
