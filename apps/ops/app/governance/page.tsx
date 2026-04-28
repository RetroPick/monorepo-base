"use client";

import { useState } from "react";

import { fetchLiveSelector } from "@/lib/api";

export default function GovernancePage() {
  const [selector, setSelector] = useState("0x");
  const [out, setOut] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onLookup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    setOut(null);
    try {
      const j = await fetchLiveSelector(selector.trim());
      setOut(JSON.stringify(j, null, 2));
    } catch (x) {
      setErr(x instanceof Error ? x.message : "failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Governance / dispatcher</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Live <code className="text-zinc-300">getSelectorModule(bytes4)</code> via
          proxy (runbook: verify routing, not just deployed module addresses).
        </p>
      </div>
      <form onSubmit={onLookup} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="block flex-1 text-sm">
          <span className="text-zinc-500">4-byte selector (with or without 0x)</span>
          <input
            value={selector}
            onChange={(e) => setSelector(e.target.value)}
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-sm text-zinc-100"
            placeholder="0x12345678"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded border border-zinc-600 bg-zinc-800 px-4 py-2 text-sm hover:bg-zinc-700 disabled:opacity-50"
        >
          {loading ? "…" : "Lookup"}
        </button>
      </form>
      {err ? (
        <p className="text-sm text-amber-300">{err}</p>
      ) : null}
      {out ? (
        <pre className="max-h-[480px] overflow-auto rounded border border-zinc-800 bg-zinc-950 p-4 text-xs text-zinc-300">
          {out}
        </pre>
      ) : null}
    </div>
  );
}
