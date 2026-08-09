import type { Address } from "viem";

/** EV-008 registry pins — Polygon mainnet CTF Exchange V2 (partially verified at impl). */
export const CTF_EXCHANGE_V2: Address = "0xE111180000d2663C0091e4f400237545B87B996B";
export const NEG_RISK_CTF_EXCHANGE_V2: Address = "0xe2222d279d744050d28e00520010520000310F59";

export type ExchangeDomainKey = "standard" | "neg_risk";

export function resolveVerifyingContract(exchangeDomain: string): Address {
  if (exchangeDomain === "neg_risk") {
    return NEG_RISK_CTF_EXCHANGE_V2;
  }
  return CTF_EXCHANGE_V2;
}
