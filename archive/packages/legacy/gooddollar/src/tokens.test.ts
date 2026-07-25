import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { CELO_ALFAJORES_CHAIN_ID } from "./chains";
import { ALFAJORES_REGISTRY_PATH, GUSD_TOKENS } from "./tokens";

const here = dirname(fileURLToPath(import.meta.url));
const registryPath = resolve(here, "../../contracts/registry.celo-alfajores.json");

type AlfajoresRegistry = {
  contracts: { stakeToken: string };
  tokenMetadata?: { stakeTokenSymbol?: string; stakeTokenDecimals?: number };
};

describe("GUSD_TOKENS registry alignment", () => {
  it("Alfajores G$ address matches registry stakeToken", () => {
    const registry = JSON.parse(readFileSync(registryPath, "utf8")) as AlfajoresRegistry;
    const token = GUSD_TOKENS[CELO_ALFAJORES_CHAIN_ID];
    expect(token).toBeDefined();
    expect(token!.address.toLowerCase()).toBe(registry.contracts.stakeToken.toLowerCase());
  });

  it("documents registry path for drift detection", () => {
    expect(ALFAJORES_REGISTRY_PATH).toBe("packages/legacy/contracts/registry.celo-alfajores.json");
    expect(readFileSync(resolve(here, "../../contracts/registry.celo-alfajores.json"), "utf8")).toContain(
      "stakeToken",
    );
  });

  it("matches registry token metadata when present", () => {
    const registry = JSON.parse(readFileSync(registryPath, "utf8")) as AlfajoresRegistry;
    const token = GUSD_TOKENS[CELO_ALFAJORES_CHAIN_ID]!;
    expect(token.symbol).toBe(registry.tokenMetadata?.stakeTokenSymbol ?? "G$");
    expect(token.decimals).toBe(registry.tokenMetadata?.stakeTokenDecimals ?? 18);
  });
});
