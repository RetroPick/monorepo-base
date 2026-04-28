"use client";

import Link from "next/link";
import { useState } from "react";

import { postTxPrepare } from "@/lib/api";

export default function PrepareTxPage() {
  const [paused, setPaused] = useState(true);
  const [out, setOut] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onPrepare(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    setOut(null);
    try {
      const j = await postTxPrepare({
        function: "pauseProgram",
        args: [paused],
      });
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
        <h1 className="text-xl font-semibold">Prepare transaction</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Whitelisted calldata only — no signing or broadcast. For the MarketEngine launch sequence
          (upsert, initialize, open epoch / rolling genesis), use{" "}
          <Link href="/launch" className="text-sky-400 hover:underline">
            Launch
          </Link>
          . Review runbook and Safe workflow before mainnet.
        </p>
      </div>
      <form onSubmit={onPrepare} className="max-w-lg space-y-4 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="text-sm font-medium text-zinc-300">pauseProgram(bool paused)</div>
        <label className="flex items-center gap-2 text-sm text-zinc-400">
          <input
            type="checkbox"
            checked={paused}
            onChange={(e) => setPaused(e.target.checked)}
          />
          paused (checked = true)
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded border border-sky-800 bg-sky-950/40 px-4 py-2 text-sm text-sky-200 hover:bg-sky-900/40 disabled:opacity-50"
        >
          {loading ? "…" : "Prepare calldata"}
        </button>
      </form>
      {err ? (
        <p className="text-sm text-amber-300">{err}</p>
      ) : null}
      {out ? (
        <pre className="max-h-[560px] overflow-auto rounded border border-zinc-800 bg-zinc-950 p-4 text-xs text-zinc-300">
          {out}
        </pre>
      ) : null}
    </div>
  );
}
