import { describe, expect, it } from "vitest";
import { HOW_RETRO_PICK_WORKS_STEPS, HOW_RETRO_PICK_WORKS_TITLE } from "@/lib/market-data/howRetroPickWorksContent";

describe("howRetroPickWorksContent", () => {
  it("defines a linear tour through settlement, payout, and optional void", () => {
    expect(HOW_RETRO_PICK_WORKS_STEPS.length).toBeGreaterThanOrEqual(6);
    expect(HOW_RETRO_PICK_WORKS_TITLE.length).toBeGreaterThan(0);
    const joined = HOW_RETRO_PICK_WORKS_STEPS.map((s) => `${s.title} ${s.body}`).join(" ").toLowerCase();
    expect(joined).toMatch(/pool|stake|claim|payout|fund|void|refund|settlement|winner/);
    const ids = new Set(HOW_RETRO_PICK_WORKS_STEPS.map((s) => s.id));
    expect(ids.size).toBe(HOW_RETRO_PICK_WORKS_STEPS.length);
    expect(HOW_RETRO_PICK_WORKS_STEPS.some((s) => s.devNote)).toBe(true);
  });
});
