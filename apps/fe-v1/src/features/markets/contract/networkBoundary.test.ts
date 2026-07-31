import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const FE_V1_SRC = join(process.cwd(), "src");
const FORBIDDEN_HOSTS = [
  "gamma-api.polymarket.com",
  "clob.polymarket.com",
  "data-api.polymarket.com",
  "bridge.polymarket.com",
  "relayer.polymarket.com",
];
const FORBIDDEN_IMPORTS = [
  "@/config/polymarket",
  "@/lib/polymarket",
  "config/polymarket",
  "lib/polymarket",
];
const FORBIDDEN_PATTERNS = ["x-api-key", "POLYMARKET_CONFIG", "fetchLiveMarkets", "fetchTrendingEvents"];

const ALLOWLIST_PREFIXES = ["features/markets/contract/networkBoundary.test.ts", "legacy-quarantine/"];

function isAllowlisted(relPath: string): boolean {
  return ALLOWLIST_PREFIXES.some((prefix) => relPath.startsWith(prefix));
}

function walkTsFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === "node_modules" || entry === ".next" || entry === "dist") continue;
      walkTsFiles(full, out);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe("fe-v1 browser network boundary", () => {
  it("does not reference upstream Polymarket hosts or legacy direct clients in active src", () => {
    const files = walkTsFiles(FE_V1_SRC);
    const violations: string[] = [];

    for (const file of files) {
      const rel = relative(FE_V1_SRC, file).replace(/\\/g, "/");
      if (isAllowlisted(rel)) continue;
      if (rel.endsWith(".test.ts") || rel.endsWith(".test.tsx")) continue;

      const content = readFileSync(file, "utf8");
      for (const host of FORBIDDEN_HOSTS) {
        if (content.includes(host)) violations.push(`${rel}: host ${host}`);
      }
      for (const imp of FORBIDDEN_IMPORTS) {
        if (content.includes(imp)) violations.push(`${rel}: import ${imp}`);
      }
      for (const pattern of FORBIDDEN_PATTERNS) {
        if (content.includes(pattern)) violations.push(`${rel}: pattern ${pattern}`);
      }
    }

    expect(violations).toEqual([]);
  });

  it("routes canonical reads through MarketsClient feature layer", () => {
    const clientFile = readFileSync(join(FE_V1_SRC, "features/markets/api/marketsClient.ts"), "utf8");
    expect(clientFile).toContain("createMarketsClient");

    const routeModules = [
      "features/markets/components/PolymarketDiscoverPanel.tsx",
      "views/EventDetailPolymarket.tsx",
      "views/MarketDetailPolymarket.tsx",
      "views/SignalsPolymarket.tsx",
    ];

    for (const mod of routeModules) {
      const content = readFileSync(join(FE_V1_SRC, mod), "utf8");
      expect(content).toMatch(/useMarkets/);
      expect(content).not.toMatch(/fetchLiveMarkets|fetchTrendingEvents|POLYMARKET_CONFIG/);
    }

    const queryFile = readFileSync(join(FE_V1_SRC, "features/markets/queries/marketsQueryOptions.ts"), "utf8");
    expect(queryFile).toContain("getMarketsClient()");
  });
});
