"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import {
  fetchTxPrepareMeta,
  postTxPrepare,
  type TxPrepareResponse,
} from "@/lib/api";
import { castSendHint, downloadPreparedJson } from "@/lib/preparedTx";
import { cn } from "@/lib/utils";

function defaultArgsFor(fn: string | undefined): string {
  if (!fn) return "[true]";
  if (fn === "pauseProgram") return "[true]";
  if (
    fn === "initializeMarket" ||
    fn === "genesisStartRolling" ||
    fn === "genesisLockRolling" ||
    fn === "executeRollingRound" ||
    fn === "haltRollingMarket" ||
    fn === "yieldEmergencyWithdraw" ||
    fn === "finalizeRecoveredYield"
  ) {
    return '["0x<bytes32 templateId>"]';
  }
  if (fn === "resetYieldRouterFailures") return "[]";
  return "[]";
}

export function PrepareExplorer() {
  const [fn, setFn] = useState<string>("pauseProgram");
  const [argsText, setArgsText] = useState(defaultArgsFor("pauseProgram"));
  const [err, setErr] = useState<string | null>(null);
  const [out, setOut] = useState<TxPrepareResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const metaQ = useQuery({
    queryKey: ["tx-prepare-meta"],
    queryFn: fetchTxPrepareMeta,
  });

  const rows = useMemo(() => metaQ.data?.functions ?? [], [metaQ.data]);
  const selectedMeta = useMemo(() => rows.find((r) => r.function === fn), [rows, fn]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    setOut(null);
    let args: unknown[];
    try {
      const parsed = JSON.parse(argsText) as unknown;
      if (!Array.isArray(parsed)) {
        throw new Error("Args JSON must be an array");
      }
      args = parsed;
    } catch (x) {
      setErr(x instanceof Error ? x.message : "invalid JSON args");
      setLoading(false);
      return;
    }
    try {
      const j = await postTxPrepare({ function: fn, args });
      setOut(j);
    } catch (x) {
      setErr(x instanceof Error ? x.message : "prepare failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[color:var(--color-primaryText)]">
          Prepare transaction
        </h1>
        <p className="mt-1 text-sm text-[color:var(--color-secondaryText)]">
          Whitelisted calldata via backend{" "}
          <code className="rounded bg-[color:var(--color-inputBg)] px-1 font-mono text-xs">
            POST /api/v1/ops/tx/prepare
          </code>
          . Sign offline via RETRODEPLOYER or Safe — nothing broadcasts from this UI.
        </p>
      </div>

      {metaQ.isError ? (
        <p className="text-sm text-amber-300">
          Could not load prepare metadata ({metaQ.error?.message}). Prepare still works if you know function names.
        </p>
      ) : null}

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-xl border border-[color:var(--color-mainBorder)] bg-[color:var(--color-primaryBg)] p-4"
      >
        <div className="grid gap-2">
          <label className="text-xs font-medium text-[color:var(--color-placeholderText)]">
            Function (whitelist)
          </label>
          <select
            value={fn}
            onChange={(e) => {
              const v = e.target.value;
              setFn(v);
              setArgsText(defaultArgsFor(v));
            }}
            className={cn(
              "rounded-lg border border-[color:var(--color-mainBorder)] bg-[color:var(--color-inputBg)] px-3 py-2 font-mono text-sm text-[color:var(--color-primaryText)]",
            )}
          >
            {rows.length > 0
              ? rows.map((r) => (
                  <option key={r.function} value={r.function}>
                    {r.function}
                  </option>
                ))
              : ["pauseProgram", "upsertTemplate", "initializeMarket"].map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
          </select>
        </div>

        {selectedMeta ? (
          <div className="rounded-lg border border-[color:var(--color-mainBorder)] bg-[color:var(--color-secondaryBg)] p-3 text-xs text-[color:var(--color-secondaryText)]">
            <p>
              <span className="text-[color:var(--color-placeholderText)]">Role: </span>
              {selectedMeta.requiredRole}
            </p>
            <p className="mt-1 font-mono text-[10px] leading-snug">{selectedMeta.runbookRef}</p>
            {selectedMeta.validationChecklist?.length ? (
              <ul className="mt-2 list-inside list-disc">
                {selectedMeta.validationChecklist.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-2">
          <label className="text-xs font-medium text-[color:var(--color-placeholderText)]">
            Args (JSON array)
          </label>
          <textarea
            value={argsText}
            onChange={(e) => setArgsText(e.target.value)}
            rows={6}
            spellCheck={false}
            className="font-mono text-xs text-[color:var(--color-primaryText)] rounded-lg border border-[color:var(--color-mainBorder)] bg-[color:var(--color-inputBg)] px-3 py-2"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg border border-[color:var(--color-containedButtonBg)] bg-[color:var(--color-containedButtonBg)] px-4 py-2 text-sm font-medium text-white hover:bg-[color:var(--color-containedButtonBgHover)] disabled:opacity-50"
        >
          {loading ? "Preparing…" : "Prepare calldata"}
        </button>
      </form>

      {err ? <p className="text-sm text-rose-300">{err}</p> : null}

      {out ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => downloadPreparedJson(out)}
              className="rounded-lg border border-[color:var(--color-mainBorder)] bg-[color:var(--color-inputBg)] px-3 py-1.5 text-xs text-[color:var(--color-primaryText)] hover:bg-[color:var(--color-inputBgHover)]"
            >
              Download JSON
            </button>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(castSendHint(out));
              }}
              className="rounded-lg border border-[color:var(--color-mainBorder)] bg-[color:var(--color-inputBg)] px-3 py-1.5 text-xs text-[color:var(--color-primaryText)] hover:bg-[color:var(--color-inputBgHover)]"
            >
              Copy cast send hint
            </button>
          </div>
          <pre className="max-h-[560px] overflow-auto rounded-xl border border-[color:var(--color-mainBorder)] bg-[color:var(--color-secondaryBg)] p-4 text-xs text-[color:var(--color-primaryText)]">
            {JSON.stringify(out, null, 2)}
          </pre>
          <p className="text-xs text-[color:var(--color-placeholderText)]">
            Broadcast:{" "}
            <code className="font-mono">
              ./scripts/RETRODEPLOYER send ./retropick-prepared.json
            </code>{" "}
            (from monorepo root, with package/contract/.env loaded).
          </p>
        </div>
      ) : null}
    </div>
  );
}
