// MARKETS_CUSTODY: env helpers only — never read or store private keys here

export { getMarketsApiOrigin } from "@/shared/lib/marketsRuntimeEnv";

export function getReownProjectId(): string {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_REOWN_PROJECT_ID) {
    return process.env.NEXT_PUBLIC_REOWN_PROJECT_ID;
  }
  return "d2f5d76bb1b000f9443e2172d3a560ba";
}
