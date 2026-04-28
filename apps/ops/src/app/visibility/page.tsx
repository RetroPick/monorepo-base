"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { fetchOpsTemplates, postFrontendVisibility } from "@/lib/api";

export default function VisibilityPage() {
  const [templateId, setTemplateId] = useState("");
  const qc = useQueryClient();

  const templatesQ = useQuery({
    queryKey: ["ops-templates"],
    queryFn: fetchOpsTemplates,
  });

  const mut = useMutation({
    mutationFn: postFrontendVisibility,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["frontend-hidden"] });
    },
  });

  const hiddenQ = useQuery({
    queryKey: ["frontend-hidden"],
    queryFn: () => postFrontendVisibility({ action: "list" }),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[color:var(--color-primaryText)]">
          Frontend visibility
        </h1>
        <p className="mt-1 text-sm text-[color:var(--color-secondaryText)]">
          Hide or unhide indexed templates from public{" "}
          <code className="rounded bg-[color:var(--color-inputBg)] px-1 font-mono text-xs">
            GET /api/v1/markets
          </code>
          . Matches RETRODEPLOYER{" "}
          <code className="rounded bg-[color:var(--color-inputBg)] px-1 font-mono text-xs">
            frontend-visibility
          </code>
          .
        </p>
      </div>

      <div className="rounded-xl border border-[color:var(--color-mainBorder)] bg-[color:var(--color-primaryBg)] p-4">
        <label className="text-xs font-medium text-[color:var(--color-placeholderText)]">
          Template ID (0x…)
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value.trim())}
            placeholder="0x…"
            className="min-w-[min(100%,20rem)] flex-1 rounded-lg border border-[color:var(--color-mainBorder)] bg-[color:var(--color-inputBg)] px-3 py-2 font-mono text-sm text-[color:var(--color-primaryText)]"
          />
          <button
            type="button"
            disabled={mut.isPending || !templateId.startsWith("0x")}
            onClick={() =>
              mut.mutate({ action: "hide", templateId })
            }
            className="rounded-lg bg-rose-900/60 px-3 py-2 text-sm text-rose-100 hover:bg-rose-900 disabled:opacity-40"
          >
            Hide
          </button>
          <button
            type="button"
            disabled={mut.isPending || !templateId.startsWith("0x")}
            onClick={() =>
              mut.mutate({ action: "unhide", templateId })
            }
            className="rounded-lg bg-emerald-900/50 px-3 py-2 text-sm text-emerald-100 hover:bg-emerald-900/70 disabled:opacity-40"
          >
            Unhide
          </button>
        </div>
        {mut.isError ? (
          <p className="mt-2 text-sm text-rose-300">
            {(mut.error as Error)?.message ?? "request failed"}
          </p>
        ) : null}
        {mut.isSuccess ? (
          <p className="mt-2 text-xs text-emerald-300">OK — refresh list below.</p>
        ) : null}
      </div>

      <section className="rounded-xl border border-[color:var(--color-mainBorder)] bg-[color:var(--color-primaryBg)] p-4">
        <h2 className="text-sm font-medium text-[color:var(--color-primaryText)]">
          Indexed templates (pick id)
        </h2>
        {templatesQ.isLoading ? (
          <p className="mt-2 text-xs text-[color:var(--color-placeholderText)]">Loading…</p>
        ) : templatesQ.data?.length ? (
          <ul className="mt-2 max-h-48 overflow-auto font-mono text-xs text-[color:var(--color-secondaryText)]">
            {templatesQ.data.map((t) => (
              <li key={t.templateId}>
                <button
                  type="button"
                  className="text-left hover:text-[color:var(--color-coloredText)]"
                  onClick={() => setTemplateId(t.templateId)}
                >
                  {t.slug.slice(0, 40)}… · {t.templateId.slice(0, 18)}…
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-[color:var(--color-placeholderText)]">No templates.</p>
        )}
      </section>

      <section>
        <h2 className="text-sm font-medium text-[color:var(--color-primaryText)]">
          Currently hidden
        </h2>
        {hiddenQ.isLoading ? (
          <p className="mt-2 text-xs text-[color:var(--color-placeholderText)]">Loading…</p>
        ) : (
          <pre className="mt-2 overflow-auto rounded-lg border border-[color:var(--color-mainBorder)] bg-[color:var(--color-secondaryBg)] p-3 text-xs text-[color:var(--color-primaryText)]">
            {JSON.stringify(hiddenQ.data, null, 2)}
          </pre>
        )}
      </section>
    </div>
  );
}
