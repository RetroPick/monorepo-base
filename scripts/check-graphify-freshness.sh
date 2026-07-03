#!/usr/bin/env bash
# Fail when graphify-out artifacts differ from git after `graphify update .`.
# Skips when graphify is not installed.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if ! command -v graphify >/dev/null 2>&1; then
  echo "skip: graphify not installed (uv tool install graphifyy)"
  exit 0
fi

if [[ ! -f "$ROOT/graphify-out/graph.json" ]]; then
  echo "graphify-out/graph.json missing; run: graphify update ." >&2
  exit 1
fi

cd "$ROOT"
graphify update . >/dev/null

if ! git diff --quiet -- graphify-out/graph.json graphify-out/GRAPH_REPORT.md 2>/dev/null; then
  echo "graphify-out is stale; run graphify update . and commit graphify-out/" >&2
  exit 1
fi

echo "graphify freshness ok"
