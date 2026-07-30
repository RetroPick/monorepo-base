import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("MarketDetailPolymarket transitions", () => {
  it("resets selected outcome state when market id changes", () => {
    const source = readFileSync(join(process.cwd(), "src/views/MarketDetailPolymarket.tsx"), "utf8");
    expect(source).toContain("setSelectedTokenId(\"\")");
    expect(source).toMatch(/useEffect\(\(\) => \{[\s\S]*setSelectedTokenId\(""\)/);
    expect(source).toContain("[decodedId]");
  });
});
