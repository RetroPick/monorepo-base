# RetroPick Graphify Runbook

Graphify outputs are local generated artifacts. The large JSON and HTML files live in `graphify-out/` and are intentionally ignored by Git.

## Common Commands

```bash
./scripts/graphify-all.sh --first-party-only
./scripts/graphify-all.sh
./scripts/graphify-all.sh --exports-only
```

Use a forced first-party rebuild after large refactors:

```bash
GRAPHIFY_FORCE=1 GRAPHIFY_EXTRACT_FLAGS=--no-cluster ./scripts/graphify-retropick.sh full
```

Use focused rebuilds when working in one area:

```bash
GRAPHIFY_FORCE=1 GRAPHIFY_EXTRACT_FLAGS=--no-cluster ./scripts/graphify-retropick.sh backend
GRAPHIFY_FORCE=1 GRAPHIFY_EXTRACT_FLAGS=--no-cluster ./scripts/graphify-retropick.sh frontend
GRAPHIFY_FORCE=1 GRAPHIFY_EXTRACT_FLAGS=--no-cluster ./scripts/graphify-retropick.sh contracts
```

## Visibility

If Cursor does not show `graphify-out/`, check whether ignored files are hidden. The tracked summary is `.dev/graphify/README.md`.

Expected local outputs:

- `graphify-out/graph.json`
- `graphify-out/GRAPH_REPORT.md`
- `graphify-out/GRAPH_TREE.html`
- `graphify-out/opensrc-*-graph.json`

## Policy

- Do not commit `graphify-out/` or `.references/`.
- Do not graph vendored Forge libraries under `package/*/lib`.
- Do not graph imported source snapshots under `apps/**/sources` unless `GRAPHIFY_INCLUDE_SOURCES=1`.
- External opensrc repositories are references only. They do not replace RetroPick architecture.

## Diagnostics

```bash
graphify diagnose multigraph --graph graphify-out/graph.json --max-examples 5
jq -r '.nodes[] | .source_file // empty' graphify-out/graph.json | rg '^package/.*/lib/'
```

The second command should print nothing for the first-party graph.
