import { describe, expect, it } from "vitest";

import {
  isCanonicalEventId,
  isCanonicalMarketId,
  isCanonicalTokenId,
  isPolymarketResourceId,
} from "../lib/ids";

describe("ids", () => {
  it("accepts canonical event ids", () => {
    expect(isCanonicalEventId("polymarket:event:123")).toBe(true);
    expect(isCanonicalEventId("polymarket:market:123")).toBe(false);
    expect(isCanonicalEventId("event:123")).toBe(false);
  });

  it("accepts canonical market ids", () => {
    expect(isCanonicalMarketId("polymarket:market:456")).toBe(true);
    expect(isCanonicalMarketId("polymarket:event:456")).toBe(false);
  });

  it("accepts canonical token ids", () => {
    expect(isCanonicalTokenId("polymarket:token:yes")).toBe(true);
  });

  it("detects polymarket resource prefix", () => {
    expect(isPolymarketResourceId("polymarket:event:x")).toBe(true);
    expect(isPolymarketResourceId("gamma:123")).toBe(false);
  });
});
