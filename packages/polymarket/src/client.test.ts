import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

import { MarketsClient, MarketsApiError } from "./index";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, "..", "fixtures");

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(join(fixturesDir, name), "utf8"));
}

function mockFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  return vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    return Promise.resolve(handler(url, init));
  }) as typeof fetch;
}

describe("MarketsClient", () => {
  it("returns eligibility on success", async () => {
    const body = loadFixture("eligibility.json");
    const fetchImpl = mockFetch((url) => {
      expect(url).toContain("/api/v1/markets/eligibility");
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json", "x-request-id": "req-1" },
      });
    });
    const client = new MarketsClient({ baseUrl: "http://api.test", fetchImpl });
    const res = await client.getEligibility();
    expect(res.data.eligible).toBe(true);
    expect(res.requestId).toBe("req-1");
    expect(res.notModified).toBe(false);
  });

  it("returns 304 with cached body when ETag matches", async () => {
    const body = loadFixture("events-list.json");
    let call = 0;
    const fetchImpl = mockFetch((_url, init) => {
      call += 1;
      if (call === 1) {
        expect(init?.headers).toBeDefined();
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { ETag: 'W/"abc"', "Content-Type": "application/json" },
        });
      }
      expect((init?.headers as Record<string, string>)["If-None-Match"]).toBe('W/"abc"');
      return new Response(null, { status: 304, headers: { ETag: 'W/"abc"' } });
    });
    const client = new MarketsClient({ baseUrl: "http://api.test", fetchImpl });
    const first = await client.listEvents();
    expect(first.data.events).toHaveLength(1);
    const second = await client.listEvents();
    expect(second.notModified).toBe(true);
    expect(second.data).toEqual(first.data);
  });

  it("maps 404 to not_found", async () => {
    const fetchImpl = mockFetch(() =>
      new Response(
        JSON.stringify({ error: { code: "not_found", message: "missing", requestId: "r404" } }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      ),
    );
    const client = new MarketsClient({ baseUrl: "http://api.test", fetchImpl });
    await expect(client.getEvent("missing")).rejects.toMatchObject({
      code: "not_found",
      requestId: "r404",
    } satisfies Partial<MarketsApiError>);
  });

  it("maps 502 to upstream", async () => {
    const fetchImpl = mockFetch(() =>
      new Response(
        JSON.stringify({ error: { code: "upstream_unavailable", message: "gamma down" } }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      ),
    );
    const client = new MarketsClient({ baseUrl: "http://api.test", fetchImpl });
    await expect(client.listEvents()).rejects.toMatchObject({ code: "upstream" });
  });

  it("maps 503 to unavailable", async () => {
    const fetchImpl = mockFetch(() =>
      new Response(
        JSON.stringify({ error: { code: "data_unavailable", message: "book stale" } }),
        { status: 503, headers: { "Content-Type": "application/json" } },
      ),
    );
    const client = new MarketsClient({ baseUrl: "http://api.test", fetchImpl });
    await expect(client.getOrderBook("m1", "t1")).rejects.toMatchObject({ code: "unavailable" });
  });

  it("aborts when signal is aborted", async () => {
    const fetchImpl = mockFetch((_url, init) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    });
    const client = new MarketsClient({ baseUrl: "http://api.test", fetchImpl, defaultTimeoutMs: 60_000 });
    const controller = new AbortController();
    const promise = client.getCapabilities({ signal: controller.signal });
    controller.abort();
    await expect(promise).rejects.toMatchObject({ code: "aborted" });
  });

  it("times out slow responses", async () => {
    const fetchImpl = mockFetch((_url, init) => {
      return new Promise<Response>((_resolve, reject) => {
        const timer = setTimeout(
          () => _resolve(new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } })),
          200,
        );
        init?.signal?.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    });
    const client = new MarketsClient({ baseUrl: "http://api.test", fetchImpl, defaultTimeoutMs: 50 });
    await expect(client.getCapabilities()).rejects.toMatchObject({ code: "timeout" });
  });

  it("throws malformed on invalid JSON", async () => {
    const fetchImpl = mockFetch(() => new Response("not-json", { status: 200 }));
    const client = new MarketsClient({ baseUrl: "http://api.test", fetchImpl });
    await expect(client.getCapabilities()).rejects.toMatchObject({ code: "malformed" });
  });

  it("parses retry-after on rate limit", async () => {
    const fetchImpl = mockFetch(() =>
      new Response(
        JSON.stringify({ error: { code: "rate_limited", message: "slow down" } }),
        { status: 429, headers: { "Content-Type": "application/json", "Retry-After": "2" } },
      ),
    );
    const client = new MarketsClient({ baseUrl: "http://api.test", fetchImpl });
    await expect(client.getCapabilities()).rejects.toMatchObject({ code: "rate_limit", retryAfterMs: 2000 });
  });
});
