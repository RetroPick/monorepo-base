import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";

import registry from "@retropick/contracts/registry.base-sepolia.json";

if ((registry.chainId as number) !== baseSepolia.id) {
  throw new Error(`Registry chainId ${registry.chainId} != baseSepolia`);
}

export const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});
