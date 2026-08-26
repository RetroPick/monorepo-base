import { describe, expect, it } from "vitest";

import { marketsRoutes } from "../routes/marketsRoutes";

describe("Markets legal routes", () => {
  it.each(["/markets/terms", "/markets/privacy"])("registers %s", (path) => {
    expect(marketsRoutes.some((route) => route.path === path)).toBe(true);
  });
});
