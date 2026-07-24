#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-backend}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REF_DIR="$ROOT_DIR/.references"
OUT_DIR="$ROOT_DIR/graphify-out"
CODE_ONLY="${GRAPHIFY_CODE_ONLY:-1}"
INCLUDE_DOCS="${GRAPHIFY_INCLUDE_DOCS:-0}"

if [ "$MODE" = "all" ]; then
  for pack in monorepo backend frontend contracts protocol ai; do
    "$0" "$pack"
  done
  exit 0
fi

PATHS_IN="$REF_DIR/opensrc-paths-$MODE.txt"
FAILED_OUT="$REF_DIR/graphify-opensrc-failed-$MODE.txt"
LOG_OUT="$REF_DIR/graphify-opensrc-$MODE.log"
MERGED_OUT="$OUT_DIR/opensrc-$MODE-graph.json"
STAGING_ROOT="${TMPDIR:-/tmp}/retropick-graphify/opensrc-$MODE-corpus"

mkdir -p "$REF_DIR" "$OUT_DIR"
: > "$FAILED_OUT"
: > "$LOG_OUT"

if ! command -v graphify >/dev/null 2>&1; then
  echo "ERROR: graphify not found. Install with: uv tool install graphifyy"
  exit 1
fi

if [ ! -f "$PATHS_IN" ]; then
  echo "ERROR: opensrc paths file missing: $PATHS_IN"
  echo "Run: ./scripts/install-opensrc-retropick-refs-v2.sh $MODE"
  exit 1
fi

EXTRACT_FLAGS=()
if [ -n "${GRAPHIFY_EXTRACT_FLAGS:-}" ]; then
  # shellcheck disable=SC2206
  EXTRACT_FLAGS=(${GRAPHIFY_EXTRACT_FLAGS})
fi

graphs=()

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

is_excluded_path() {
  local path="$1"

  case "$path" in
    */graphify-out/*|*/node_modules/*|*/vendor/*|*/.next/*|*/dist/*|*/build/*|*/target/*|*/out/*|*/cache/*|*/coverage/*|*/.turbo/*|*/.git/*)
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

  while IFS= read -r -d '' file; do
    is_excluded_path "$file" && continue
    is_supported_file "$file" || continue

    rel_file="${file#$src/}"
    mkdir -p "$dst/$(dirname "$rel_file")"
    cp "$file" "$dst/$rel_file"
  done < <(find "$src" -type f -print0)

  [ -n "$(find "$dst" -type f -print -quit)" ]
}

echo "==> Graphifying opensrc pack: $MODE"
echo "==> Paths: $PATHS_IN"
echo "==> Merged output: $MERGED_OUT"
echo "==> Code-only staging: $CODE_ONLY"
echo "==> Include docs: $INCLUDE_DOCS"

if [ -f "$MERGED_OUT" ] && [ "${GRAPHIFY_FORCE:-0}" != "1" ]; then
  echo "SKIP existing merged graph: $MERGED_OUT"
  exit 0
fi

if [ "$CODE_ONLY" = "1" ]; then
  echo "==> Staging corpus: $STAGING_ROOT"
  rm -rf "$STAGING_ROOT"
  mkdir -p "$STAGING_ROOT"
fi

while IFS= read -r line; do
  [[ -z "$line" ]] && continue
  ref="${line%% => *}"
  path="${line#* => }"

  if [[ "$path" == "fetched, but path lookup failed" || ! -d "$path" ]]; then
    echo "SKIP invalid path: $line" | tee -a "$FAILED_OUT"
    continue
  fi

  scan_path="$path"
  graph="$path/graphify-out/graph.json"

  if [ "$CODE_ONLY" = "1" ]; then
    safe_ref="$(printf '%s' "$ref" | tr '/:@ ' '____')"
    scan_path="$STAGING_ROOT/$safe_ref"
    if ! copy_supported_corpus "$path" "$scan_path"; then
      echo "SKIP no supported files: $ref => $path" | tee -a "$FAILED_OUT"
      continue
    fi
    graph="$scan_path/graphify-out/graph.json"
  fi

  if [ -f "$graph" ] && [ "${GRAPHIFY_FORCE:-0}" != "1" ]; then
    echo "SKIP existing graph: $ref"
    graphs+=("$graph")
    continue
  fi

  echo ""
  echo "----"
  echo "Graphify opensrc ref: $ref"
  echo "Path: $path"
  if graphify extract "$scan_path" "${EXTRACT_FLAGS[@]}" 2>&1 | tee -a "$LOG_OUT"; then
    if [ -f "$graph" ]; then
      graphs+=("$graph")
    else
      echo "FAILED no graph output: $ref => $path" | tee -a "$FAILED_OUT"
    fi
  else
    echo "FAILED graphify extract: $ref => $path" | tee -a "$FAILED_OUT"
  fi
done < "$PATHS_IN"

if [ "${#graphs[@]}" -eq 0 ]; then
  echo "ERROR: no opensrc graphs were generated for mode: $MODE"
  exit 1
fi

if [ "${#graphs[@]}" -eq 1 ]; then
  cp "${graphs[0]}" "$MERGED_OUT"
else
  graphify merge-graphs "${graphs[@]}" --out "$MERGED_OUT"
fi

echo ""
echo "Merged ${#graphs[@]} graph(s) into $MERGED_OUT"
if [ -s "$FAILED_OUT" ]; then
  echo "Some refs failed. Check:"
  echo "  $FAILED_OUT"
fi
