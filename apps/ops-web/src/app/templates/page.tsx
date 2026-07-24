import { TemplatesDataTable } from "@/components/templates/TemplatesDataTable";
import { fetchOpsTemplates } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  let rows: Awaited<ReturnType<typeof fetchOpsTemplates>> = [];
  let err: string | null = null;
  try {
    rows = await fetchOpsTemplates();
  } catch {
    err = "Failed to load templates.";
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[color:var(--color-primaryText)]">Markets (templates)</h1>
        <p className="mt-1 text-sm text-[color:var(--color-secondaryText)]">
          Indexed template + ledger fields. Source: <code className="text-[color:var(--color-primaryText)]">indexed</code>.
          Sort columns client-side; drill into a template for live vs indexed detail.
        </p>
      </div>

      {err ? (
        <p className="rounded-lg border border-amber-900/60 bg-amber-950/40 px-3 py-2 text-sm text-amber-200">
          {err}
        </p>
      ) : (
        <TemplatesDataTable rows={rows} />
      )}
    </div>
  );
}
