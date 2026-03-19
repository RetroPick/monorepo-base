import * as anchor from "@coral-xyz/anchor";

describe("pyth direction flow", () => {
  it("uses posted Pyth updates for checkpoint_a and checkpoint_b", async () => {
    // TODO:
    // - fetch/post update account for lock timestamp
    // - invoke lock_epoch with PriceUpdateV2 account
    // - fetch/post later update account
    // - invoke resolve_epoch and assert winning mask
  });
});
