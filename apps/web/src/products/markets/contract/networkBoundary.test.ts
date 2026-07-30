import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const MARKETS_ROOT = join(__dirname, "..");
const FORBIDDEN = [
  "gamma-api.polymarket.com",
  "clob.polymarket.com",
  "data-api.polymarket.com",
  "bridge.polymarket.com",
  "relayer.polymarket.com",
];

function walkTsFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === "node_modules" || entry.startsWith(".")) continue;
      walkTsFiles(full, out);
    } else if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith(".test.ts") && !entry.endsWith(".test.tsx")) {
      out.push(full);
    }
  }
  return out;
}

describe("Markets browser network boundary", () => {
  it("does not reference upstream Polymarket API hosts in product code", () => {
    const files = walkTsFiles(MARKETS_ROOT);
    const violations: string[] = [];
    for (const file of files) {
      const content = readFileSync(file, "utf8");
      for (const host of FORBIDDEN) {
        if (content.includes(host)) {
          violations.push(`${file}: ${host}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("routes reads through MarketsClient BFF paths", () => {
    const clientFile = readFileSync(join(MARKETS_ROOT, "api/marketsClient.ts"), "utf8");
    expect(clientFile).toContain("createMarketsClient");
    const queryFile = readFileSync(join(MARKETS_ROOT, "queries/marketsQueryOptions.ts"), "utf8");
    expect(queryFile).toContain("getMarketsClient()");
  });
});
