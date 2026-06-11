import Link from "next/link";

import { OpsDeployPreflight } from "@/components/OpsDeployPreflight";
import { OpsOperatorHub } from "@/components/OpsOperatorHub";
import { fetchGlobalState } from "@/lib/api";
import { publicClient } from "@/lib/chain";

export const dynamic = "force-dynamic";

const LINKS = [
  { href: "/monitor", label: "Monitor", desc: "Aggregates vs RETRODEPLOYER monitor" },
  { href: "/templates", label: "Markets", desc: "Templates + ledger rows" },
  { href: "/launch", label: "Lifecycle", desc: "Launch / epoch tooling" },
  { href: "/prepare", label: "Transactions", desc: "Calldata prepare + export" },
  { href: "/keeper", label: "Keeper", desc: "Schedule & executions" },
  { href: "/incidents", label: "Incidents", desc: "Indexed incidents" },
  { href: "/oracle", label: "Oracles & feeds", desc: "Registry + stub health" },
  { href: "/visibility", label: "Visibility", desc: "Hide templates from public API" },
  { href: "/retrodeployer", label: "RETRODEPLOYER", desc: "CLI bridge & runbook pointers" },
  { href: "/governance", label: "Governance", desc: "Dispatcher selector wiring" },
] as const;

/** Ordered playbook — mirrors docs/feature/ops-admin-operator-workflow.md */
const PLAYBOOK: { step: number; href: string; title: string; detail: string }[] = [
  { step: 0, href: "/", title: "Overview", detail: "Preflight + hub (this page); then drill down" },
  { step: 1, href: "/monitor", title: "Monitor", detail: "Indexer vs RPC; global counters" },
  { step: 2, href: "/templates", title: "Markets", detail: "Templates, halts, epoch drill-down" },
  { step: 3, href: "/launch", title: "Lifecycle", detail: "Epoch transitions vs engine truth" },
  { step: 4, href: "/prepare", title: "Transactions", detail: "Calldata prepare / export for signing" },
  { step: 5, href: "/keeper", title: "Keeper", detail: "Schedule + execution audit trail" },
  { step: 6, href: "/oracle", title: "Oracles", detail: "Feeds + health signals" },
  { step: 7, href: "/incidents", title: "Incidents", detail: "Automation + operator triage" },
  { step: 8, href: "/visibility", title: "Visibility", detail: "Public API exposure" },
  { step: 9, href: "/governance", title: "Governance", detail: "Dispatcher / admin wiring visibility" },
  { step: 10, href: "/retrodeployer", title: "RETRODEPLOYER", detail: "Chain / deploy runbooks" },
];

export default async function HomePage() {
  let gs: Awaited<ReturnType<typeof fetchGlobalState>> | null = null;
  let err: string | null = null;
  let chainHead: bigint | null = null;
  try {
    gs = await fetchGlobalState();
  } catch {
    err = "Could not load global state.";
  }
  try {
    chainHead = await publicClient.getBlockNumber();
  } catch {
    /* optional */
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[color:var(--color-primaryText)]">
          Overview
        </h1>
        <p className="mt-2 text-sm text-[color:var(--color-secondaryText)]">
          Indexed projections plus optional live RPC refreshes.{" "}
          <span className="text-[color:var(--color-placeholderText)]">
            Optional auth: set OPS_STATIC_TOKEN and send Authorization Bearer on requests.
          </span>
        </p>
      </div>

      <OpsDeployPreflight />
      <OpsOperatorHub variant="theme" />

      <section className="rounded-xl border border-[color:var(--color-mainBorder)] bg-[color:var(--color-primaryBg)] p-4 text-sm">
        <h2 className="font-medium text-[color:var(--color-primaryText)]">Operator playbook</h2>
        <p className="mt-2 text-xs text-[color:var(--color-placeholderText)]">
          Recommended order for bring-up or post-deploy checks. Full matrix (agents, APIs, report
          template):{" "}
          <code className="rounded bg-[color:var(--color-tabActiveBgHover)] px-1 py-0.5 text-[11px]">
            docs/feature/ops-admin-operator-workflow.md
          </code>
        </p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-[color:var(--color-secondaryText)]">
          {PLAYBOOK.map((row) => (
            <li key={row.step}>
              <Link
                href={row.href}
                className="font-medium text-[color:var(--color-primaryText)] underline-offset-2 hover:underline"
              >
                {row.step}. {row.title}
              </Link>
              <span className="text-[color:var(--color-placeholderText)]"> — {row.detail}</span>
            </li>
          ))}
        </ol>
      </section>

      {err ? (
        <p className="rounded-lg border border-amber-900/60 bg-amber-950/40 px-3 py-2 text-sm text-amber-200">
          {err}
        </p>
      ) : null}

      {chainHead != null ? (
        <p className="text-xs text-[color:var(--color-placeholderText)]">
          RPC chain head (viem, public client):{" "}
          <span className="font-mono text-[color:var(--color-primaryText)]">{chainHead.toString()}</span>
        </p>
      ) : null}

      {gs ? (
        <>
          <section className="rounded-xl border border-[color:var(--color-mainBorder)] bg-[color:var(--color-primaryBg)] p-4 text-sm">
            <h2 className="font-medium text-[color:var(--color-primaryText)]">Indexer snapshot</h2>
            <dl className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <dt className="text-[color:var(--color-placeholderText)]">Templates</dt>
                <dd className="font-mono text-xl text-[color:var(--color-primaryText)]">
                  {gs.counts.templates}
                </dd>
              </div>
              <div>
                <dt className="text-[color:var(--color-placeholderText)]">Rolling halted</dt>
                <dd className="font-mono text-xl text-[color:var(--color-primaryText)]">
                  {gs.counts.rollingHalted}
                </dd>
              </div>
              <div>
                <dt className="text-[color:var(--color-placeholderText)]">Open incidents</dt>
                <dd className="font-mono text-xl text-[color:var(--color-primaryText)]">
                  {gs.counts.openIncidents}
                </dd>
              </div>
            </dl>
            {gs.liveFieldsNote ? (
              <p className="mt-4 border-t border-[color:var(--color-mainBorder)] pt-3 text-xs text-[color:var(--color-placeholderText)]">
                {gs.liveFieldsNote}
              </p>
            ) : null}
          </section>

          <section>
            <h2 className="text-xs font-medium uppercase tracking-wide text-[color:var(--color-placeholderText)]">
              Navigate
            </h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="block rounded-xl border border-[color:var(--color-mainBorder)] bg-[color:var(--color-primaryBg)] px-4 py-3 transition hover:border-[color:var(--color-mainBorderHover)] hover:bg-[color:var(--color-tabActiveBgHover)]"
                  >
                    <div className="font-medium text-[color:var(--color-primaryText)]">{item.label}</div>
                    <div className="mt-0.5 text-xs text-[color:var(--color-placeholderText)]">{item.desc}</div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}
    </div>
  );
}
