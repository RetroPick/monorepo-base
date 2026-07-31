import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const FE_V1_SRC = join(process.cwd(), "src");
const QUARANTINE_DIR = "legacy-quarantine";

const ALLOWLIST_REL_PATHS = new Set([
  "features/markets/contract/quarantineBoundary.test.ts",
  "features/markets/contract/networkBoundary.test.ts",
  "features/markets/contract/productionBundle.test.ts",
]);

const FORBIDDEN_IMPORT_PATTERNS = [
  "@/legacy-quarantine",
  "legacy-quarantine/",
  "../legacy-quarantine",
  "../../legacy-quarantine",
  "../../../legacy-quarantine",
];

const FORBIDDEN_LEGACY_MODULES = [
  "legacy-quarantine/views/MarketDetailRouter",
  "legacy-quarantine/views/MarketDetail",
  "legacy-quarantine/views/Portfolio",
  "legacy-quarantine/views/PredictionDashboard",
  "legacy-quarantine/views/AboveBelowDashboard",
  "legacy-quarantine/components/SportsDashboard",
  "data/mockMarkets",
  "data/mockDiscovery",
  "generateMockMarkets",
  "fetchTrendingEvents",
  "fetchLiveMarkets",
];

function walkTsFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === "node_modules" || entry === ".next" || entry === "dist" || entry === QUARANTINE_DIR) {
        continue;
      }
      walkTsFiles(full, out);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe("legacy-quarantine import boundary", () => {
  it("blocks active source from importing quarantined modules", () => {
    const files = walkTsFiles(FE_V1_SRC);
    const violations: string[] = [];

    for (const file of files) {
      const rel = relative(FE_V1_SRC, file).replace(/\\/g, "/");
      if (ALLOWLIST_REL_PATHS.has(rel)) continue;
      if (rel.startsWith(`${QUARANTINE_DIR}/`)) continue;

      const content = readFileSync(file, "utf8");
      for (const pattern of FORBIDDEN_IMPORT_PATTERNS) {
        if (content.includes(pattern)) {
          violations.push(`${rel}: ${pattern}`);
        }
      }
      for (const legacyModule of FORBIDDEN_LEGACY_MODULES) {
        if (content.includes(legacyModule)) {
          violations.push(`${rel}: legacy module ${legacyModule}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
