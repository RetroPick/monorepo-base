export type UnsignedOrderPayload = {
  salt: string;
  maker: string;
  signer: string;
  tokenId: string;
  makerAmount: string;
  takerAmount: string;
  side: number;
  signatureType: number;
  timestamp: string;
  metadata: string;
  builder: string;
};

export type HashMetadata = {
  chainId: number;
  marketId: string;
  tokenId: string;
};

/** Serialize hash envelope with Go struct field order for preview hash binding. */
function serializeHashEnvelope(payload: UnsignedOrderPayload, metadata: HashMetadata): string {
  const unsignedPayload = {
    salt: payload.salt,
    maker: payload.maker,
    signer: payload.signer,
    tokenId: payload.tokenId,
    makerAmount: payload.makerAmount,
    takerAmount: payload.takerAmount,
    side: payload.side,
    signatureType: payload.signatureType,
    timestamp: payload.timestamp,
    metadata: payload.metadata,
    builder: payload.builder,
  };
  const meta = {
    chainId: metadata.chainId,
    marketId: metadata.marketId,
    tokenId: metadata.tokenId,
  };
  return JSON.stringify({ unsignedPayload, metadata: meta });
}

/** SHA-256 hex with 0x prefix — mirrors backend orders.ComputeContentHash canonical JSON. */
export async function computeContentHash(
  payload: UnsignedOrderPayload,
  metadata: HashMetadata,
): Promise<string> {
  const raw = serializeHashEnvelope(payload, metadata);
  const encoded = new TextEncoder().encode(raw);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `0x${hex}`;
}

export function contentHashMatches(expected: string, actual: string): boolean {
  return expected.toLowerCase() === actual.toLowerCase();
}
