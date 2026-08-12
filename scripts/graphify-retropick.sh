#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-core}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$ROOT_DIR/graphify-out"
LOG_DIR="$ROOT_DIR/.references"
LOG_OUT="$LOG_DIR/graphify-retropick-$MODE.log"
FAILED_OUT="$LOG_DIR/graphify-retropick-failed-$MODE.txt"
STAGING_ROOT="${TMPDIR:-/tmp}/retropick-graphify/retropick-$MODE-corpus"
CODE_ONLY="${GRAPHIFY_CODE_ONLY:-1}"
INCLUDE_DOCS="${GRAPHIFY_INCLUDE_DOCS:-0}"
INCLUDE_SOURCES="${GRAPHIFY_INCLUDE_SOURCES:-0}"

mkdir -p "$OUT_DIR" "$LOG_DIR"
: > "$LOG_OUT"
: > "$FAILED_OUT"

if ! command -v graphify >/dev/null 2>&1; then
  echo "ERROR: graphify not found. Install with: uv tool install graphifyy"
  exit 1
fi

case "$MODE" in
  core)
    TARGETS=(
      "apps/backend"
      "apps/backend/internal/markets"
      "apps/web"
      "apps/docs/app"
      "apps/docs/components"
      "apps/docs/contents"
      ".harness/products/markets-v1"
      "schemas"
      "archive/contracts/legacy-pool-v1/src"
      "archive/contracts/legacy-pool-v1/script"
      "archive/contracts/legacy-pool-v1/test"
    )
    ;;
  backend)
    TARGETS=("apps/backend" "apps/backend/internal/markets")
    ;;
  frontend)
    TARGETS=(
      "apps/web"
      "apps/docs/app"
      "apps/docs/components"
      "apps/docs/contents"
      "apps/landing-web/src"
    )
    ;;
  contracts)
    TARGETS=(
      "archive/contracts/legacy-pool-v1/src"
      "archive/contracts/legacy-pool-v1/script"
      "archive/contracts/legacy-pool-v1/test"
      "archive/contracts/legacy-pool-v1/treasury-vault-eth/src"
      "archive/contracts/legacy-pool-v1/treasury-vault-eth/script"
      "archive/contracts/legacy-pool-v1/treasury-vault-eth/test"
    )
    ;;
  docs)
    TARGETS=(
      "README.md"
      "PRODUCTION.md"
      "DECISIONS.md"
      "AGENTS.md"
      "ORCHESTRATOR.md"
      "HARNESS.md"
      "docs"
      ".dev"
      ".harness"
    )
    INCLUDE_DOCS=1
    ;;
  upgrade)
    TARGETS=(".dev/.upgrade_v3" ".ai" "scripts")
    INCLUDE_DOCS=1
    ;;
  full)
    TARGETS=(
      "README.md"
      "PRODUCTION.md"
      "DECISIONS.md"
      "AGENTS.md"
      "ORCHESTRATOR.md"
      "HARNESS.md"
      "apps/backend"
      "apps/backend/internal/markets"
      "apps/web"
      "apps/docs/app"
      "apps/docs/components"
      "apps/docs/contents"
      "apps/landing-web/src"
      "packages"
      "archive/contracts/legacy-pool-v1/src"
      "archive/contracts/legacy-pool-v1/script"
      "archive/contracts/legacy-pool-v1/test"
      "archive/contracts/legacy-pool-v1/treasury-vault-eth/src"
      "archive/contracts/legacy-pool-v1/treasury-vault-eth/script"
      "archive/contracts/legacy-pool-v1/treasury-vault-eth/test"
      "docs"
      ".dev"
      ".harness"
      ".harness/products/markets-v1"
      ".ai"
      "scripts"
      "docker"
      ".github"
      "schemas"
    )
    INCLUDE_DOCS="${GRAPHIFY_INCLUDE_DOCS:-0}"
    ;;
  *)
    echo "ERROR: invalid mode: $MODE"
    echo "Use one of: core backend frontend contracts docs upgrade full"
    exit 1
    ;;
esac

graphs=()
EXTRACT_FLAGS=()
if [ -n "${GRAPHIFY_EXTRACT_FLAGS:-}" ]; then
  # shellcheck disable=SC2206
  EXTRACT_FLAGS=(${GRAPHIFY_EXTRACT_FLAGS})
fi

is_excluded_path() {
  local path="$1"

  case "$path" in
    */graphify-out/*|*/.references/*|*/node_modules/*|*/.next/*|*/dist/*|*/build/*|*/target/*|*/out/*|*/cache/*|*/broadcast/*|*/coverage/*|*/.turbo/*|*/.vercel/*)
      return 0
      ;;
    */archive/contracts/legacy-pool-v1/lib/*|*/archive/contracts/legacy-pool-v1/treasury-vault-eth/lib/*)
      return 0
      ;;
    */apps/*/sources/*)
      [ "$INCLUDE_SOURCES" = "1" ] && return 1
      return 0
      ;;
  esac

  return 1
}

copy_supported_corpus() {
  local src="$1"
  local dst="$2"
  rm -rf "$dst"
  mkdir -p "$dst"

  if [ -f "$src" ]; then
    if is_supported_file "$src"; then
      cp "$src" "$dst/$(basename "$src")"
    fi
    [ -n "$(find "$dst" -type f -print -quit)" ]
    return
  fi

  while IFS= read -r -d '' file; do
    is_excluded_path "$file" && continue
    is_supported_file "$file" || continue

    rel_file="${file#$src/}"
    mkdir -p "$dst/$(dirname "$rel_file")"
    cp "$file" "$dst/$rel_file"
  done < <(find "$src" -type f -print0)

  [ -n "$(find "$dst" -type f -print -quit)" ]
}

is_supported_file() {
  local file="$1"

  case "$file" in
    *.go|*.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs|*.sol|*.rs|*.py|*.sql|*.sh)
      return 0
      ;;
    *.md|*.mdx|*.txt)
      [ "$INCLUDE_DOCS" = "1" ] && return 0
      return 1
      ;;
  esac

  return 1
}

echo "==> Graphifying RetroPick mode: $MODE"
echo "==> Output graph: $OUT_DIR/graph.json"
echo "==> Log: $LOG_OUT"
echo "==> Code-only staging: $CODE_ONLY"
echo "==> Include docs: $INCLUDE_DOCS"
echo "==> Include imported source snapshots: $INCLUDE_SOURCES"

if [ "$CODE_ONLY" = "1" ]; then
  echo "==> Staging corpus: $STAGING_ROOT"
  rm -rf "$STAGING_ROOT"
  mkdir -p "$STAGING_ROOT"
fi

for rel in "${TARGETS[@]}"; do
  target="$ROOT_DIR/$rel"
  if [ ! -e "$target" ]; then
    echo "SKIP missing: $rel" | tee -a "$FAILED_OUT"
    continue
  fi

  scan_target="$target"
  graph="$target/graphify-out/graph.json"

  if [ "$CODE_ONLY" = "1" ]; then
    safe_name="${rel//\//__}"
    safe_name="${safe_name//./_}"
    scan_target="$STAGING_ROOT/$safe_name"
    if ! copy_supported_corpus "$target" "$scan_target"; then
      echo "SKIP no supported files: $rel" | tee -a "$FAILED_OUT"
      continue
    fi
    graph="$scan_target/graphify-out/graph.json"
  fi

  if [ -f "$graph" ] && [ "${GRAPHIFY_FORCE:-0}" != "1" ]; then
    echo "SKIP existing graph: $rel"
    graphs+=("$graph")
    continue
  fi

  echo ""
  echo "----"
  echo "Graphify: $rel"
  if graphify extract "$scan_target" "${EXTRACT_FLAGS[@]}" 2>&1 | tee -a "$LOG_OUT"; then
    if [ -f "$graph" ]; then
      graphs+=("$graph")
    else
      echo "FAILED no graph output: $rel" | tee -a "$FAILED_OUT"
    fi
  else
    echo "FAILED graphify extract: $rel" | tee -a "$FAILED_OUT"
  fi
done

if [ "${#graphs[@]}" -eq 0 ]; then
  echo "ERROR: no graphs were generated."
  exit 1
fi

mkdir -p "$OUT_DIR"
if [ "${#graphs[@]}" -eq 1 ]; then
  cp "${graphs[0]}" "$OUT_DIR/graph.json"
else
  graphify merge-graphs "${graphs[@]}" --out "$OUT_DIR/graph.json"
fi

echo ""
echo "Merged ${#graphs[@]} graph(s) into $OUT_DIR/graph.json"

if graphify cluster-only "$ROOT_DIR" --graph "$OUT_DIR/graph.json" --no-viz 2>&1 | tee -a "$LOG_OUT"; then
  echo "Cluster/report refreshed for $OUT_DIR/graph.json"
else
  echo "WARN: cluster-only failed; merged graph.json still exists." | tee -a "$FAILED_OUT"
fi

echo ""
echo "Done. Graph output:"
echo "  $OUT_DIR/graph.json"
echo "  $OUT_DIR/GRAPH_REPORT.md"
if [ -s "$FAILED_OUT" ]; then
  echo "Some targets failed. Check:"
  echo "  $FAILED_OUT"
fi
