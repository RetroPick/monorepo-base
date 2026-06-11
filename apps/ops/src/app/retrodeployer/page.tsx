export const dynamic = "force-dynamic";

export default function RetrodeployerPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-[color:var(--color-primaryText)]">
          RETRODEPLOYER CLI bridge
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[color:var(--color-secondaryText)]">
          Browser UI covers indexed reads, live RPC snapshots, calldata prepare, and visibility toggles.
          Bash-heavy workflows stay on your workstation: feed discovery, cast broadcast, deploy-all, and
          automated recover loops invoke{" "}
          <code className="rounded bg-[color:var(--color-inputBg)] px-1 font-mono text-xs">
            ./scripts/RETRODEPLOYER
          </code>{" "}
          from the monorepo root with{" "}
          <code className="rounded bg-[color:var(--color-inputBg)] px-1 font-mono text-xs">
            package/prediction-v2/.env
          </code>
          .
        </p>
      </div>

      <section className="rounded-xl border border-[color:var(--color-mainBorder)] bg-[color:var(--color-primaryBg)] p-4">
        <h2 className="text-sm font-medium text-[color:var(--color-primaryText)]">Prepare → send</h2>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-[color:var(--color-secondaryBg)] p-3 font-mono text-[11px] leading-relaxed text-[color:var(--color-primaryText)]">
{`# After downloading JSON from Transactions page:
./scripts/RETRODEPLOYER send ./retropick-prepared.json

# Or pipe:
cat prepared.json | ./scripts/RETRODEPLOYER send -`}
        </pre>
      </section>

      <section className="rounded-xl border border-[color:var(--color-mainBorder)] bg-[color:var(--color-primaryBg)] p-4">
        <h2 className="text-sm font-medium text-[color:var(--color-primaryText)]">Feeds / oracle recovery</h2>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-[color:var(--color-secondaryBg)] p-3 font-mono text-[11px] leading-relaxed text-[color:var(--color-primaryText)]">
{`./scripts/RETRODEPLOYER feeds discover
./scripts/RETRODEPLOYER feeds auto-assign <NN|all>
./scripts/RETRODEPLOYER feeds fix-adapter <feedProxy…>
./scripts/RETRODEPLOYER recover-feed-drift <NN|0xtemplate>`}
        </pre>
      </section>

      <section className="rounded-xl border border-[color:var(--color-mainBorder)] bg-[color:var(--color-primaryBg)] p-4">
        <h2 className="text-sm font-medium text-[color:var(--color-primaryText)]">Pipeline</h2>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-[color:var(--color-secondaryBg)] p-3 font-mono text-[11px] leading-relaxed text-[color:var(--color-primaryText)]">
{`./scripts/RETRODEPLOYER deploy-all
./scripts/RETRODEPLOYER auto-deploy <1-9|01-09> [--fast]

# Help / menu
./scripts/RETRODEPLOYER help
pnpm run retropick:deployer -- help`}
        </pre>
      </section>

      <section className="rounded-xl border border-[color:var(--color-mainBorder)] bg-[color:var(--color-primaryBg)] p-4">
        <h2 className="text-sm font-medium text-[color:var(--color-primaryText)]">Environment (shell)</h2>
        <p className="mt-2 text-xs text-[color:var(--color-secondaryText)]">
          Loaded from <code className="font-mono">package/prediction-v2/.env</code> / repo root. See{" "}
          <code className="font-mono">./scripts/RETRODEPLOYER help</code> for full list.
        </p>
        <ul className="mt-3 space-y-1 font-mono text-[11px] text-[color:var(--color-secondaryText)]">
          <li>
            <span className="text-[color:var(--color-placeholderText)]">API_URL</span> — Go API for prepare (defaults to{" "}
            http://127.0.0.1:8080); matches <code className="text-[color:var(--color-primaryText)]">NEXT_PUBLIC_API_URL</code>{" "}
            for this dashboard.
          </li>
          <li>
            <span className="text-[color:var(--color-placeholderText)]">RPC_URL</span>,{" "}
            <span className="text-[color:var(--color-placeholderText)]">CAST_ACCOUNT</span> — Foundry broadcast
          </li>
          <li>
            <span className="text-[color:var(--color-placeholderText)]">UPSERT_DIR</span>,{" "}
            <span className="text-[color:var(--color-placeholderText)]">RETRODEPLOYER_FAST_EPOCH</span>,{" "}
            <span className="text-[color:var(--color-placeholderText)]">RETRODEPLOYER_INDEX_WAIT_SEC</span>, …
          </li>
          <li>
            <span className="text-[color:var(--color-placeholderText)]">OPS_PREPARE_RPM</span> — Go API rate limit for{" "}
            <code className="text-[color:var(--color-primaryText)]">POST /tx/prepare</code> (default 60/min per IP)
          </li>
        </ul>
      </section>

      <section className="rounded-xl border border-[color:var(--color-mainBorder)] bg-[color:var(--color-primaryBg)] p-4">
        <h2 className="text-sm font-medium text-[color:var(--color-primaryText)]">Runbook</h2>
        <p className="mt-2 text-sm text-[color:var(--color-secondaryText)]">
          Authoritative procedures:{" "}
          <span className="font-mono text-xs text-[color:var(--color-coloredText)]">
            package/prediction-v2/.operator/.runbook.md
          </span>
        </p>
      </section>
    </div>
  );
}
