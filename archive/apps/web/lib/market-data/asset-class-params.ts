import type { AssetClass } from "./types";

const VALID: readonly AssetClass[] = ["crypto", "commodity", "fx", "macro", "benchmarks", "weather"];

export function parseAssetClassParam(param: string | undefined): AssetClass {
  if (!param) return "crypto";
  const lower = param.toLowerCase();
  if ((VALID as readonly string[]).includes(lower)) {
    return lower as AssetClass;
  }
  return "crypto";
}

export function isValidAssetClassParam(param: string | undefined): boolean {
  if (!param) return false;
  return (VALID as readonly string[]).includes(param.toLowerCase());
}
