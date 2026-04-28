declare const registry: {
  environment: string;
  chainId: number;
  explorers: { basescan: string; blockscout: string };
  contracts: Record<string, string>;
  abiFiles: Record<string, string>;
};
export default registry;
