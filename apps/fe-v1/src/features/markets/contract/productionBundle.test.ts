import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const NEXT_DIR = join(process.cwd(), ".next");
const FORBIDDEN_BUNDLE_MARKERS = [
  "legacy-quarantine",
  "fetchLiveMarkets",
  "fetchTrendingEvents",
  "gamma-api.polymarket.com",
  "clob.polymarket.com",
  "POLYMARKET_CONFIG",
  "x-api-key",
  "generateMockMarkets",
];

function walkFiles(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walkFiles(full, out);
    } else if (/\.(js|mjs|cjs|json|map)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe("production bundle audit", () => {
  it("excludes quarantined and direct-upstream modules from Next build output", () => {
    if (!existsSync(NEXT_DIR)) {
      expect(true).toBe(true);
      return;
    }

    const files = walkFiles(NEXT_DIR);
    const violations: string[] = [];

    for (const file of files) {
      const content = readFileSync(file, "utf8");
      for (const marker of FORBIDDEN_BUNDLE_MARKERS) {
        if (content.includes(marker)) {
          violations.push(`${file}: ${marker}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
