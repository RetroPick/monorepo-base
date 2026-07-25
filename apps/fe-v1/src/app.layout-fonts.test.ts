import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const layoutPath = path.resolve(process.cwd(), "app/layout.tsx");

describe("RootLayout font loading", () => {
  it("does not depend on remote Google font services", () => {
    const source = readFileSync(layoutPath, "utf8");

    expect(source).not.toContain("next/font/google");
    expect(source).not.toContain("fonts.googleapis.com");
    expect(source).not.toContain("fonts.gstatic.com");
  });

  it("self-hosts core UI fonts via @fontsource in the root layout", () => {
    const source = readFileSync(layoutPath, "utf8");
    expect(source).toContain("@fontsource/inter/");
    expect(source).toContain("@fontsource/plus-jakarta-sans/");
    expect(source).toContain("@fontsource/jetbrains-mono/");
  });
});
