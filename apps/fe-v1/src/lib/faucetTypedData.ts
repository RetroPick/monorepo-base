/**
 * EIP-712 typed data for {@link TokenFaucet.requestWithSig}; must match
 * OpenZeppelin EIP712("TokenFaucet","1") and MintRequest typehash in Solidity.
 */

export function buildFaucetMintSignRequest(params: {
  chainId: number;
  faucetAddress: `0x${string}`;
  recipient: `0x${string}`;
  amount: bigint;
  nonce: bigint;
  deadline: bigint;
}) {
  const domain = {
    name: "TokenFaucet",
    version: "1",
    chainId: BigInt(params.chainId),
    verifyingContract: params.faucetAddress,
  } as const;

  const types = {
    MintRequest: [
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint64" },
    ],
  } as const;

  const message = {
    recipient: params.recipient,
    amount: params.amount,
    nonce: params.nonce,
    deadline: params.deadline,
  } as const;

  return {
    domain,
    types,
    primaryType: "MintRequest" as const,
    message,
  };
}
