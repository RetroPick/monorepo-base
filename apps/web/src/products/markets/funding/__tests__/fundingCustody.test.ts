import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { FORBIDDEN_CUSTODY_PATTERNS, assertNoCustodyViolation } from "../../wallet/lib/custodyInvariants";

const fundingRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function collectTsFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    if (entry === "node_modules" || entry === "__tests__") continue;
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...collectTsFiles(full));
      continue;
    }
    if (/\.tsx?$/.test(entry)) files.push(full);
  }
  return files;
}

describe("funding custody invariants", () => {
  it("funding TS sources pass custody pattern scan", () => {
    for (const file of collectTsFiles(fundingRoot)) {
      const source = readFileSync(file, "utf8");
      expect(() => assertNoCustodyViolation(source, file)).not.toThrow();
    }
  });

  it("defines forbidden custody patterns", () => {
    expect(FORBIDDEN_CUSTODY_PATTERNS.length).toBeGreaterThan(0);
  });
});
