export type ChainId = number;
export type Address = `0x${string}`;

export type ChainConfig = {
  chainId: ChainId;
  name: string;
  rpcUrl: string;
  marketEngineAddress?: Address;
};

export type ReadContractRequest = {
  address: Address;
  abi: readonly unknown[];
  functionName: string;
  args?: readonly unknown[];
};

export interface ChainReader {
  readContract<T = unknown>(request: ReadContractRequest): Promise<T>;
}

export function assertChainConfig(config: ChainConfig): ChainConfig {
  if (!Number.isInteger(config.chainId) || config.chainId <= 0) {
    throw new Error("chainId must be a positive integer");
  }
  if (!config.rpcUrl) throw new Error("rpcUrl is required");
  return config;
}
