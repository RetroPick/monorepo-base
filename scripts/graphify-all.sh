#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$ROOT_DIR/graphify-out"
REF_DIR="$ROOT_DIR/.references"
DOC_DIR="$ROOT_DIR/.dev/graphify"
LOG_OUT="$REF_DIR/graphify-all.log"

RUN_FIRST_PARTY=1
RUN_OPENSRC=1
RUN_EXPORTS=1
RETRY_CONTRACTS=0

for arg in "$@"; do
  case "$arg" in
    --first-party-only)
      RUN_OPENSRC=0
      ;;
    --opensrc-only)
      RUN_FIRST_PARTY=0
      ;;
    --exports-only)
      RUN_FIRST_PARTY=0
      RUN_OPENSRC=0
      RUN_EXPORTS=1
      ;;
    --no-exports)
      RUN_EXPORTS=0
      ;;
    --retry-contracts)
      RETRY_CONTRACTS=1
      ;;
    *)
      echo "ERROR: unknown argument: $arg"
      echo "Use: $0 [--first-party-only|--opensrc-only|--exports-only|--no-exports|--retry-contracts]"
      exit 1
      ;;
  esac
done

mkdir -p "$OUT_DIR" "$REF_DIR" "$DOC_DIR"
: > "$LOG_OUT"

if ! command -v graphify >/dev/null 2>&1; then
  echo "ERROR: graphify not found. Install with: uv tool install graphifyy"
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq not found."
  exit 1
fi

run_logged() {
  echo ""
  echo "==> $*"
  "$@" 2>&1 | tee -a "$LOG_OUT"
}

graph_count() {
  local graph="$1"
  local label="$2"

  if [ -f "$graph" ]; then
    jq -r --arg label "$label" '"\($label)|\(.nodes|length)|\(.links|length)|\(.hyperedges // [] | length)"' "$graph"
  else
    printf '%s|missing|missing|missing\n' "$label"
  fi
}

write_summary() {
  local summary="$DOC_DIR/README.md"
  local ignored
  ignored="$(git check-ignore -v graphify-out .references 2>/dev/null | sed 's/^/- /' || true)"

  {
    echo "# RetroPick Graphify Outputs"
    echo ""
    echo "Generated graph files are local artifacts. They stay ignored by Git because they are large."
    echo ""
    echo "## Visible Outputs"
    echo ""
    echo "- \`graphify-out/GRAPH_REPORT.md\` - first-party graph report."
    echo "- \`graphify-out/GRAPH_TREE.html\` - local browser tree for first-party graph navigation."
    echo "- \`graphify-out/graph.json\` - first-party graph JSON."
    echo "- \`graphify-out/opensrc-*-graph.json\` - focused external reference graphs."
    echo ""
    echo "## Current Graph Counts"
    echo ""
    echo "| Graph | Nodes | Links | Hyperedges | Size |"
    echo "|---|---:|---:|---:|---:|"
    while IFS='|' read -r label nodes links hyperedges; do
      local file
      case "$label" in
        retropick) file="$OUT_DIR/graph.json" ;;
        opensrc-monorepo) file="$OUT_DIR/opensrc-monorepo-graph.json" ;;
        opensrc-backend) file="$OUT_DIR/opensrc-backend-graph.json" ;;
        opensrc-frontend) file="$OUT_DIR/opensrc-frontend-graph.json" ;;
        opensrc-contracts) file="$OUT_DIR/opensrc-contracts-graph.json" ;;
        opensrc-protocol) file="$OUT_DIR/opensrc-protocol-graph.json" ;;
        opensrc-ai) file="$OUT_DIR/opensrc-ai-graph.json" ;;
        *) file="" ;;
      esac
      if [ -n "$file" ] && [ -f "$file" ]; then
        size="$(du -h "$file" | awk '{print $1}')"
      else
        size="missing"
      fi
      echo "| \`$label\` | $nodes | $links | $hyperedges | $size |"
    done < <(
      graph_count "$OUT_DIR/graph.json" "retropick"
      graph_count "$OUT_DIR/opensrc-monorepo-graph.json" "opensrc-monorepo"
      graph_count "$OUT_DIR/opensrc-backend-graph.json" "opensrc-backend"
      graph_count "$OUT_DIR/opensrc-frontend-graph.json" "opensrc-frontend"
      graph_count "$OUT_DIR/opensrc-contracts-graph.json" "opensrc-contracts"
      graph_count "$OUT_DIR/opensrc-protocol-graph.json" "opensrc-protocol"
      graph_count "$OUT_DIR/opensrc-ai-graph.json" "opensrc-ai"
    )
    echo ""
    echo "## Why Cursor May Hide Results"
    echo ""
    echo "\`graphify-out/\` and \`.references/\` are ignored by \`.gitignore\`. Some Cursor/Git sidebars hide ignored files by default."
    echo ""
    if [ -n "$ignored" ]; then
      echo "\`\`\`text"
      echo "$ignored"
      echo "\`\`\`"
      echo ""
    fi
    echo "## Rebuild Commands"
    echo ""
    echo "\`\`\`bash"
    echo "./scripts/graphify-all.sh --first-party-only"
    echo "./scripts/graphify-all.sh"
    echo "./scripts/graphify-all.sh --exports-only"
    echo "GRAPHIFY_FORCE=1 GRAPHIFY_EXTRACT_FLAGS=--no-cluster ./scripts/graphify-retropick.sh full"
    echo "GRAPHIFY_INCLUDE_DOCS=1 ./scripts/graphify-all.sh --first-party-only  # requires an LLM API key for Markdown/docs"
    echo "\`\`\`"
    echo ""
    echo "## Notes"
    echo ""
    echo "- First-party graphing excludes vendored Forge libs under \`package/*/lib\`."
    echo "- Markdown/docs are opt-in because headless Graphify requires an LLM API key for semantic extraction."
    echo "- Imported source snapshots under \`apps/**/sources\` are skipped unless \`GRAPHIFY_INCLUDE_SOURCES=1\`."
    echo "- opensrc graphs are references only; they are not replacement architecture."
  } > "$summary"
}

if [ "$RETRY_CONTRACTS" = "1" ]; then
  run_logged "$ROOT_DIR/scripts/install-opensrc-retropick-refs-v2.sh" contracts
fi

if [ "$RUN_FIRST_PARTY" = "1" ]; then
  run_logged env \
    GRAPHIFY_FORCE="${GRAPHIFY_FORCE:-1}" \
    GRAPHIFY_CODE_ONLY="${GRAPHIFY_CODE_ONLY:-1}" \
    GRAPHIFY_INCLUDE_DOCS="${GRAPHIFY_INCLUDE_DOCS:-0}" \
    GRAPHIFY_EXTRACT_FLAGS="${GRAPHIFY_EXTRACT_FLAGS:---no-cluster}" \
    "$ROOT_DIR/scripts/graphify-retropick.sh" full
fi

if [ "$RUN_OPENSRC" = "1" ]; then
  run_logged env \
    GRAPHIFY_CODE_ONLY="${GRAPHIFY_CODE_ONLY:-1}" \
    GRAPHIFY_EXTRACT_FLAGS="${GRAPHIFY_EXTRACT_FLAGS:---no-cluster}" \
    "$ROOT_DIR/scripts/graphify-opensrc-pack.sh" all
fi

if [ "$RUN_EXPORTS" = "1" ] && [ -f "$OUT_DIR/graph.json" ]; then
  run_logged graphify tree --graph "$OUT_DIR/graph.json" --output "$OUT_DIR/GRAPH_TREE.html" --root "$ROOT_DIR" --label "RetroPick"
  run_logged graphify diagnose multigraph --graph "$OUT_DIR/graph.json" --max-examples 5
fi

write_summary

echo ""
echo "Graphify summary:"
echo "  $DOC_DIR/README.md"
echo "  $OUT_DIR/GRAPH_REPORT.md"
echo "  $OUT_DIR/GRAPH_TREE.html"
