import type { TypedDataDefinition } from "viem";

import { POLYGON_CHAIN_ID } from "../../wallet/config/chains";

import type { OrderPreviewResponse } from "./tradingApiClient";
import type { UnsignedOrderPayload } from "./computeContentHash";
import { resolveVerifyingContract } from "./exchangeRegistry";

const ORDER_TYPES = {
  Order: [
    { name: "salt", type: "uint256" },
    { name: "maker", type: "address" },
    { name: "signer", type: "address" },
    { name: "tokenId", type: "uint256" },
    { name: "makerAmount", type: "uint256" },
    { name: "takerAmount", type: "uint256" },
    { name: "side", type: "uint8" },
    { name: "signatureType", type: "uint8" },
    { name: "timestamp", type: "uint256" },
    { name: "metadata", type: "string" },
    { name: "builder", type: "bytes32" },
  ],
} as const;

function builderToBytes32(raw: string): `0x${string}` {
  const stripped = raw.startsWith("0x") ? raw.slice(2) : raw;
  const padded = stripped.padStart(64, "0").slice(0, 64);
  return `0x${padded}` as `0x${string}`;
}

function payloadToMessage(payload: UnsignedOrderPayload) {
  return {
    salt: BigInt(payload.salt),
    maker: payload.maker as `0x${string}`,
    signer: payload.signer as `0x${string}`,
    tokenId: BigInt(payload.tokenId),
    makerAmount: BigInt(payload.makerAmount),
    takerAmount: BigInt(payload.takerAmount),
    side: payload.side,
    signatureType: payload.signatureType,
    timestamp: BigInt(payload.timestamp),
    metadata: payload.metadata,
    builder: builderToBytes32(payload.builder),
  };
}

export function buildOrderTypedData(
  preview: OrderPreviewResponse,
): TypedDataDefinition<typeof ORDER_TYPES, "Order"> {
  const verifyingContract = resolveVerifyingContract(preview.exchangeDomain);
  const chainId = preview.humanSummary.chainId || POLYGON_CHAIN_ID;

  return {
    types: ORDER_TYPES,
    primaryType: "Order",
    domain: {
      name: "Polymarket CTF Exchange",
      version: "2",
      chainId,
      verifyingContract,
    },
    message: payloadToMessage(preview.unsignedPayload),
  };
}

export function buildOrderTypedDataFromPayload(
  payload: UnsignedOrderPayload,
  exchangeDomain: string,
  chainId: number,
): TypedDataDefinition<typeof ORDER_TYPES, "Order"> {
  const verifyingContract = resolveVerifyingContract(exchangeDomain);
  return {
    types: ORDER_TYPES,
    primaryType: "Order",
    domain: {
      name: "Polymarket CTF Exchange",
      version: "2",
      chainId,
      verifyingContract,
    },
    message: payloadToMessage(payload),
  };
}
