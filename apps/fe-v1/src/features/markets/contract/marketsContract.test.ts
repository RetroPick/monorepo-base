import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, "../../../../../../packages/polymarket/fixtures");

describe("Markets OpenAPI fixtures", () => {
  it("eligibility fixture has required fields", () => {
    const body = JSON.parse(readFileSync(join(fixturesDir, "eligibility.json"), "utf8"));
    expect(body).toMatchObject({ eligible: expect.any(Boolean), checkedAt: expect.any(String) });
  });

  it("capabilities fixture has trading disabled", () => {
    const body = JSON.parse(readFileSync(join(fixturesDir, "capabilities.json"), "utf8"));
    expect(body.trading).toBe(false);
    expect(body.combos).toBe(false);
  });

  it("events list fixture matches catalog shape", () => {
    const body = JSON.parse(readFileSync(join(fixturesDir, "events-list.json"), "utf8"));
    expect(body.schemaVersion).toBe("1");
    expect(body.events[0]).toMatchObject({
      id: expect.any(String),
      title: expect.any(String),
      freshness: expect.objectContaining({ state: expect.any(String) }),
    });
  });
});
