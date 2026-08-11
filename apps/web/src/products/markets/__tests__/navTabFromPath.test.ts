import { describe, expect, it } from "vitest";

import { navTabFromPath } from "../components/shell/types";

describe("navTabFromPath", () => {
  it("maps discover tab query to explore vs markets", () => {
    expect(navTabFromPath("/markets", "?tab=explore")).toBe("explore");
    expect(navTabFromPath("/markets", "?tab=markets")).toBe("markets");
    expect(navTabFromPath("/markets", "")).toBe("explore");
  });

  it("maps intelligence and portfolio paths", () => {
    expect(navTabFromPath("/markets/intelligence")).toBe("intelligence");
    expect(navTabFromPath("/markets/portfolio")).toBe("portfolio");
  });
});
