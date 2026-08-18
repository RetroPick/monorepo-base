#!/usr/bin/env node
/**
 * Parses archive/packages/legacy/abi/address.md and writes registry JSON
 * to archive/packages/legacy/contracts/ (epoch reference only).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const addressMd = path.join(root, "archive/packages/legacy/abi/address.md");
const md = fs.readFileSync(addressMd, "utf8");

function mustMatch(label, re) {
  const m = md.match(re);
  if (!m) throw new Error(`generate-contract-registry: could not find ${label}`);
  return ("0x" + m[1]).toLowerCase();
}

function mustText(label, re) {
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
    marketEngine: "archive/packages/legacy/abi/IMarketEngine.json",
    dispatcher: "archive/packages/legacy/abi/MarketEngineDispatcher.json",
    stakeToken: "archive/packages/legacy/abi/MockERC20.json",
    faucet: "archive/packages/legacy/abi/TokenFaucet.json",
  },
};

const json = JSON.stringify(registry, null, 2) + "\n";

const outTs = path.join(root, "archive/packages/legacy/contracts/registry.base-sepolia.json");

fs.mkdirSync(path.dirname(outTs), { recursive: true });
fs.writeFileSync(outTs, json);
console.log("Wrote", outTs);
