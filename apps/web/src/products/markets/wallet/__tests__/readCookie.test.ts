import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { readCookie } from "../lib/readCookie";

describe("readCookie", () => {
  beforeEach(() => {
    document.cookie = "mkt_csrf=; max-age=0; path=/";
  });

  afterEach(() => {
    document.cookie = "mkt_csrf=; max-age=0; path=/";
  });

  it("returns cookie value when present", () => {
    document.cookie = "mkt_csrf=abc123; path=/";
    expect(readCookie("mkt_csrf")).toBe("abc123");
  });

  it("returns null when cookie is missing", () => {
    expect(readCookie("mkt_csrf")).toBeNull();
  });

  it("decodes encoded cookie values", () => {
    document.cookie = "mkt_csrf=abc%2B123; path=/";
    expect(readCookie("mkt_csrf")).toBe("abc+123");
  });
});
