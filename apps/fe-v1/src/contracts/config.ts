/**
 * RetroPick contract registry & ABIs
 *
 * Canonical Base Sepolia deployment: `@retropick/contracts/registry.base-sepolia.json`.
 * MarketEngine calls use `IMarketEngine` ABI against the **proxy** (.dev/abi-map.md).
 */
import type { Abi } from "viem";
import { erc20Abi } from "viem";
import { getPublicEnv } from "@/lib/runtimeEnv";
import IMarketEngineJSON from "@retropick/abi/IMarketEngine.json";
/** Module ABI holds MarketEngine `error` entries omitted from the interface-only JSON. */
import MarketEngineUserOpsClaimsJSON from "@retropick/abi/MarketEngineUserOpsClaimsModule.json";
import MockERC20JSON from "@retropick/abi/MockERC20.json";
import TokenFaucetJSON from "@retropick/abi/TokenFaucet.json";
import registry from "@retropick/contracts/registry.base-sepolia.json";
import ExecutionLedgerABI from "./abi/ExecutionLedger.json";
import MarketRegistryABI from "./abi/MarketRegistry.json";
import LegacyFaucetABI from "./abi/Faucet.json";

const marketEngineCustomErrors = (MarketEngineUserOpsClaimsJSON as readonly { type?: string }[]).filter(
  (item): item is { type: "error"; name: string; inputs: readonly unknown[] } => item.type === "error",
);

/** Interface functions/events + custom errors so viem can decode reverts (e.g. `BettingClosed`). */
const marketEngineAbi: Abi = [...IMarketEngineJSON, ...marketEngineCustomErrors] as Abi;

export const REGISTRY_CHAIN_ID = registry.chainId as number;

export const ABIS = {
  MarketEngine: marketEngineAbi,
  ERC20: erc20Abi,
  /** Testnet stake token ABI. Includes public `mint(address,uint256)`. */
  MockERC20: MockERC20JSON as Abi,
  /** On-chain `TokenFaucet` (Base Sepolia testnet), `request(uint256)`. */
  TokenFaucet: TokenFaucetJSON as Abi,
  /** Legacy multi-token faucet shape, `claim(address token)`. */
  Faucet: LegacyFaucetABI as Abi,
  ExecutionLedger: ExecutionLedgerABI as Abi,
  MarketRegistry: MarketRegistryABI as Abi,
} as const;

const ZERO = "0x0000000000000000000000000000000000000000" as `0x${string}`;

export interface ChainContracts {
  marketEngineProxy: `0x${string}`;
  stakeToken: `0x${string}`;
  tokenFaucet: `0x${string}`;
  RetroPickRouter?: `0x${string}`;
  YieldRouter?: `0x${string}`;
}

export const CONTRACT_ADDRESSES_BY_CHAIN: Record<number, ChainContracts> = {
  [REGISTRY_CHAIN_ID]: {
    marketEngineProxy: registry.contracts.marketEngineProxy as `0x${string}`,
    stakeToken: registry.contracts.stakeToken as `0x${string}`,
    tokenFaucet: registry.contracts.tokenFaucet as `0x${string}`,
  },
  42161: {
    marketEngineProxy: (getPublicEnv("MARKET_ENGINE_ADDRESS") || ZERO) as `0x${string}`,
    stakeToken: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    tokenFaucet: ZERO,
  },
  421614: {
    marketEngineProxy: (getPublicEnv("MARKET_ENGINE_ADDRESS_TESTNET") || ZERO) as `0x${string}`,
    stakeToken: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
    tokenFaucet: ZERO,
  },
};

/** Flat addresses for legacy hooks / UI that are not yet chain-scoped. */
export const CONTRACT_ADDRESSES = {
  ExecutionLedger: (getPublicEnv("EXECUTION_LEDGER_ADDRESS") || ZERO) as `0x${string}`,
  MarketRegistry: (getPublicEnv("MARKET_REGISTRY_ADDRESS") || ZERO) as `0x${string}`,
  /**
   * Default on-chain testnet faucet (`TokenFaucet`) when profile does not override `contractAddress`.
   */
  Faucet: (getPublicEnv("LEGACY_FAUCET_ADDRESS") ||
    registry.contracts.tokenFaucet) as `0x${string}`,
} as const;

export function getContractAddresses(chainId: number): ChainContracts {
  return CONTRACT_ADDRESSES_BY_CHAIN[chainId] ?? CONTRACT_ADDRESSES_BY_CHAIN[REGISTRY_CHAIN_ID];
}

export function getMarketEngineAddress(chainId: number): `0x${string}` {
  return getContractAddresses(chainId).marketEngineProxy;
}

export function getRouterAddress(chainId: number): `0x${string}` | undefined {
  return getContractAddresses(chainId).RetroPickRouter;
}
