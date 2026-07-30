import { describe, expect, it } from "vitest";

import { marketsKeys } from "../queries/marketsKeys";

describe("marketsKeys", () => {
  it("uses distinct keys for paginated list and infinite list", () => {
    const listKey = marketsKeys.events.list();
    const infiniteKey = marketsKeys.events.infiniteList();
    expect(listKey).not.toEqual(infiniteKey);
    expect(infiniteKey).toContain("infinite");
  });
});
