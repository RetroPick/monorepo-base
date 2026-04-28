#!/usr/bin/env node
/**
 * Parses package/abi/address.md and writes registry JSON (abi-map shape)
 * to packages/contracts/ and apps/backend/internal/registrydata/
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function mustMatch(label, re) {
  const md = fs.readFileSync(path.join(root, "package/abi/address.md"), "utf8");
  const m = md.match(re);
  if (!m) throw new Error(`generate-contract-registry: could not find ${label}`);
  return ("0x" + m[1]).toLowerCase();
}

function mustText(label, re) {
  const md = fs.readFileSync(path.join(root, "package/abi/address.md"), "utf8");
  const m = md.match(re);
  if (!m) throw new Error(`generate-contract-registry: could not find ${label}`);
  return m[1];
}

const contracts = {
  marketEngineProxy: mustMatch(
    "proxy",
    /Proxy \(`ERC1967Proxy`\): `0x([a-fA-F0-9]{40})`/,
  ),
  marketEngineImplementation: mustMatch(
    "implementation",
    /Implementation \(`MarketEngineDispatcher`\): `0x([a-fA-F0-9]{40})`/,
  ),
  stakeToken: mustMatch(
    "stake token",
    /MockERC20 stake token: `0x([a-fA-F0-9]{40})`/,
  ),
  tokenFaucet: mustMatch("faucet", /TokenFaucet: `0x([a-fA-F0-9]{40})`/),
  chainlinkAdapter: mustMatch(
    "ChainlinkAdapter",
    /Price oracle \/ ChainlinkAdapter: `0x([a-fA-F0-9]{40})`/,
  ),
  rateAdapter: mustMatch("RateAdapter", /RateAdapter: `0x([a-fA-F0-9]{40})`/),
  smartDataAdapter: mustMatch(
    "SmartDataAdapter",
    /SmartDataAdapter: `0x([a-fA-F0-9]{40})`/,
  ),
  macroAdapter: mustMatch("MacroAdapter", /MacroAdapter: `0x([a-fA-F0-9]{40})`/),
  equityAdapter: mustMatch("EquityAdapter", /EquityAdapter: `0x([a-fA-F0-9]{40})`/),
  adminModule: mustMatch(
    "admin module",
    /MarketEngineAdminModule: `0x([a-fA-F0-9]{40})`/,
  ),
  viewModule: mustMatch("view module", /MarketEngineViewModule: `0x([a-fA-F0-9]{40})`/),
  userOpsClaimsModule: mustMatch(
    "user ops",
    /MarketEngineUserOpsClaimsModule: `0x([a-fA-F0-9]{40})`/,
  ),
  coreLifecycleModule: mustMatch(
    "core lifecycle",
    /MarketEngineCoreLifecycleModule: `0x([a-fA-F0-9]{40})`/,
  ),
  rollingLifecycleModule: mustMatch(
    "rolling lifecycle",
    /MarketEngineRollingLifecycleModule: `0x([a-fA-F0-9]{40})`/,
  ),
};

const registry = {
  environment: "base-sepolia",
  chainId: 84532,
  explorers: {
    basescan: "https://sepolia.basescan.org",
    blockscout: "https://base-sepolia.blockscout.com",
  },
  contracts,
  tokenMetadata: {
    stakeTokenSymbol: mustText(
      "stake token symbol",
      /MockERC20 stake token symbol: `([^`]+)`/,
    ),
    stakeTokenDecimals: Number(
      mustText("stake token decimals", /MockERC20 stake token decimals: `(\d+)`/),
    ),
  },
  abiFiles: {
    marketEngine: "package/abi/IMarketEngine.json",
    dispatcher: "package/abi/MarketEngineDispatcher.json",
    stakeToken: "package/abi/MockERC20.json",
    faucet: "package/abi/TokenFaucet.json",
  },
};

const json = JSON.stringify(registry, null, 2) + "\n";

const outTs = path.join(root, "packages/contracts/registry.base-sepolia.json");
const outGo = path.join(root, "apps/backend/internal/registrydata/registry.json");

fs.mkdirSync(path.dirname(outTs), { recursive: true });
fs.mkdirSync(path.dirname(outGo), { recursive: true });
fs.writeFileSync(outTs, json);
fs.writeFileSync(outGo, json);
console.log("Wrote", outTs);
console.log("Wrote", outGo);
