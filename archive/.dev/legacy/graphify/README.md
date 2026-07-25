# RetroPick Graphify Outputs

Generated graph files are local artifacts. They stay ignored by Git because they are large.

## Visible Outputs

- `graphify-out/GRAPH_REPORT.md` - first-party graph report.
- `graphify-out/GRAPH_TREE.html` - local browser tree for first-party graph navigation.
- `graphify-out/graph.json` - first-party graph JSON.
- `graphify-out/opensrc-*-graph.json` - focused external reference graphs.

## Current Graph Counts

| Graph | Nodes | Links | Hyperedges | Size |
|---|---:|---:|---:|---:|
| `retropick` | 5435 | 10523 | 0 | 6.3M |
| `opensrc-monorepo` | 470347 | 920372 | 0 | 523M |
| `opensrc-backend` | 118584 | 260929 | 0 | 145M |
| `opensrc-frontend` | 390865 | 790604 | 0 | 464M |
| `opensrc-contracts` | 30514 | 76627 | 0 | 40M |
| `opensrc-protocol` | 49650 | 115349 | 0 | 61M |
| `opensrc-ai` | 64058 | 136880 | 0 | 78M |

## Why Cursor May Hide Results

`graphify-out/` and `.references/` are ignored by `.gitignore`. Some Cursor/Git sidebars hide ignored files by default.

```text
- .gitignore:42:**/graphify-out/	graphify-out
- .gitignore:43:.references/	.references
```

## Rebuild Commands

```bash
./scripts/graphify-all.sh --first-party-only
./scripts/graphify-all.sh
./scripts/graphify-all.sh --exports-only
GRAPHIFY_FORCE=1 GRAPHIFY_EXTRACT_FLAGS=--no-cluster ./scripts/graphify-retropick.sh full
GRAPHIFY_INCLUDE_DOCS=1 ./scripts/graphify-all.sh --first-party-only  # requires an LLM API key for Markdown/docs
```

## Notes

- First-party graphing excludes vendored Forge libs under `package/*/lib`.
- Markdown/docs are opt-in because headless Graphify requires an LLM API key for semantic extraction.
- Imported source snapshots under `apps/**/sources` are skipped unless `GRAPHIFY_INCLUDE_SOURCES=1`.
- opensrc graphs are references only; they are not replacement architecture.
