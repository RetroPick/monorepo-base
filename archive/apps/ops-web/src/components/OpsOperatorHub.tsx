import Link from "next/link";

import { cn } from "@/lib/utils";

const DASH_LINKS = [
  { href: "/prepare", label: "Prepare" },
  { href: "/launch", label: "Launch" },
  { href: "/templates", label: "Templates" },
  { href: "/monitor", label: "Monitor" },
  { href: "/keeper", label: "Keeper" },
  { href: "/incidents", label: "Incidents" },
  { href: "/oracle", label: "Oracle" },
  { href: "/visibility", label: "Visibility" },
  { href: "/governance", label: "Governance" },
  { href: "/retrodeployer", label: "RETRODEPLOYER" },
] as const;

type HubVariant = "theme" | "zinc";

function shellClass(variant: HubVariant) {
  return variant === "zinc"
    ? "rounded-lg border border-zinc-800 bg-zinc-900/30"
    : "rounded-xl border border-[color:var(--color-mainBorder)] bg-[color:var(--color-primaryBg)]";
}

function titleClass(variant: HubVariant) {
  return variant === "zinc"
    ? "text-sm font-medium text-zinc-200"
    : "text-sm font-medium text-[color:var(--color-primaryText)]";
}

function bodyClass(variant: HubVariant) {
  return variant === "zinc"
    ? "text-xs text-zinc-400"
    : "text-xs text-[color:var(--color-secondaryText)]";
}

function linkClass(variant: HubVariant) {
  return variant === "zinc"
    ? "text-sky-400 underline hover:no-underline"
    : "text-[color:var(--color-coloredLinkText)] underline hover:no-underline";
}

function monoClass(variant: HubVariant) {
  return variant === "zinc"
    ? "rounded bg-zinc-800 px-1 font-mono text-[11px] text-zinc-300"
    : "rounded bg-[color:var(--color-inputBg)] px-1 font-mono text-[11px] text-[color:var(--color-primaryText)]";
}

export type OpsOperatorHubProps = {
  variant?: HubVariant;
  className?: string;
};

/** Cross-route navigation + repo runbook paths (no hosted docs — paths are relative to clone root). */
export function OpsOperatorHub({ variant = "theme", className }: OpsOperatorHubProps) {
  const shell = shellClass(variant);
  const t = titleClass(variant);
  const b = bodyClass(variant);
  const l = linkClass(variant);
  const m = monoClass(variant);

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <section className={cn(shell, "p-4")}>
        <h2 className={t}>Dashboard shortcuts</h2>
        <p className={cn("mt-2", b)}>Jump between operator surfaces without using the global nav.</p>
        <ul className={cn("mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm", variant === "zinc" ? "text-zinc-300" : "text-[color:var(--color-coloredText)]")}>
          {DASH_LINKS.map((item) => (
            <li key={item.href}>
              <Link className={l} href={item.href}>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className={cn(shell, "p-4")}>
        <h2 className={t}>Runbooks (repo)</h2>
        <p className={cn("mt-2", b)}>
          Open these in your editor from the monorepo root; they are the written source of truth for prod and
          backend operations.
        </p>
        <ul className={cn("mt-3 list-disc space-y-2 pl-5", b)}>
          <li>
            <code className={m}>PRODUCTION.md</code> — production checklist and env expectations.
          </li>
          <li>
            <code className={m}>.dev/backend/operations-runbook.md</code> — indexer, keeper, API incidents.
          </li>
          <li>
            <code className={m}>docs/feature/ops-admin-operator-workflow.md</code> — route ↔ API ↔ agent map.
          </li>
        </ul>
      </section>
    </div>
  );
}
