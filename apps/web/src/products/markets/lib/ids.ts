export function isPolymarketResourceId(id: string): boolean {
  return id.startsWith("polymarket:");
}

export function isCanonicalEventId(id: string): boolean {
  return id.startsWith("polymarket:event:");
}

export function isCanonicalMarketId(id: string): boolean {
  return id.startsWith("polymarket:market:");
}

export function isCanonicalTokenId(id: string): boolean {
  return id.startsWith("polymarket:token:");
}
