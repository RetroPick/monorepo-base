import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FORBIDDEN = /\b(bet-slip|wager|jackpot|casino|parlay)\b/i;
const ALLOWED_CONTEXT = /\b(read-only|unavailable|forbidden|no gambling)\b/i;

const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function collectSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    if (entry === "node_modules" || entry === "__tests__") continue;
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...collectSourceFiles(full));
      continue;
    }
    if (/\.(tsx?|md)$/.test(entry)) files.push(full);
  }
  return files;
}

describe("trading copy guardrails", () => {
  it("does not use forbidden gambling UX terms in trading UI strings", () => {
    const violations: string[] = [];

    for (const file of collectSourceFiles(moduleRoot)) {
      const content = readFileSync(file, "utf8");
      const lines = content.split("\n");
      lines.forEach((line, index) => {
        if (!FORBIDDEN.test(line)) return;
        if (ALLOWED_CONTEXT.test(line)) return;
        violations.push(`${path.relative(moduleRoot, file)}:${index + 1}: ${line.trim()}`);
      });
    }

    expect(violations).toEqual([]);
  });
});
