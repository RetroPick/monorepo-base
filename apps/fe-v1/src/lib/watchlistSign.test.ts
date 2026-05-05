import { describe, expect, it } from "vitest";

import {
  buildWatchlistAddSignMessage,
  buildWatchlistImportSignMessage,
  buildWatchlistRemoveSignMessage,
} from "./watchlistSign";

describe("watchlistSign", () => {
  it("matches backend canonical add message", () => {
    const msg = buildWatchlistAddSignMessage(84532, "0xAbC", "0xDeF00000000000000000000000000000000000000000000000000000000000001", 1_700_000_000, 3);
    expect(msg).toBe(
      "RetroPick watchlist v1\nchainId=84532\nwallet=0xabc\ntemplateId=0xdef00000000000000000000000000000000000000000000000000000000000001\naction=add\ndeadline=1700000000\nnonce=3\n",
    );
  });

  it("matches backend canonical remove message", () => {
    const msg = buildWatchlistRemoveSignMessage(
      84532,
      "0xAbC",
      "0xDeF00000000000000000000000000000000000000000000000000000000000001",
      1_700_000_000,
      3,
    );
    expect(msg).toBe(
      "RetroPick watchlist v1\nchainId=84532\nwallet=0xabc\ntemplateId=0xdef00000000000000000000000000000000000000000000000000000000000001\naction=remove\ndeadline=1700000000\nnonce=3\n",
    );
  });

  it("matches backend canonical import message with sorted ids", () => {
    const msg = buildWatchlistImportSignMessage(
      84532,
      "0xAAA0000000000000000000000000000000000000",
      [
        "0xbb00000000000000000000000000000000000000000000000000000000000002",
        "0xaa00000000000000000000000000000000000000000000000000000000000001",
      ],
      99,
      0,
    );
    expect(msg).toBe(
      "RetroPick watchlist import v1\nchainId=84532\nwallet=0xaaa0000000000000000000000000000000000000\ntemplateIds=0xaa00000000000000000000000000000000000000000000000000000000000001,0xbb00000000000000000000000000000000000000000000000000000000000002\ndeadline=99\nnonce=0\n",
    );
  });
});
