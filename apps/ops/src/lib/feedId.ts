import { type Address, pad } from "viem";

/**
 * On-chain feed id for Chainlink templates: `bytes32(uint256(uint160(proxyAddress)))` — left-padded address.
 */
export function proxyAddressToFeedId(address: Address): `0x${string}` {
  return pad(address, { size: 32 });
}
