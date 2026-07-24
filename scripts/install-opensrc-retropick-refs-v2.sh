#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-monorepo}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AI_DIR="$ROOT_DIR/.ai"
REF_DIR="$ROOT_DIR/.references"

PATHS_OUT="$REF_DIR/opensrc-paths-$MODE.txt"
FAILED_OUT="$REF_DIR/opensrc-failed-$MODE.txt"
LOG_OUT="$REF_DIR/opensrc-install-$MODE.log"

mkdir -p "$AI_DIR" "$REF_DIR"

has_cmd() {
  command -v "$1" >/dev/null 2>&1
}

install_ripgrep_if_possible() {
  if has_cmd rg; then
    return 0
  fi

  echo "rg/ripgrep not found. It is optional but strongly recommended."
  if has_cmd sudo && has_cmd apt-get; then
    echo "Trying to install ripgrep with apt..."
    sudo apt-get update
    sudo apt-get install -y ripgrep
  else
    echo "Skip ripgrep auto-install. Install manually later if needed."
  fi
}

ensure_opensrc() {
  if has_cmd opensrc; then
    echo "==> opensrc already installed: $(command -v opensrc)"
    return 0
  fi

  if ! has_cmd npm; then
    echo "ERROR: npm not found. Install Node.js/npm first."
    exit 1
  fi

  echo "==> Installing opensrc globally with npm..."
  npm install -g opensrc

  if ! has_cmd opensrc; then
    echo "ERROR: opensrc installed but command not found in PATH."
    echo "Check npm global bin path, then add it to PATH."
    exit 1
  fi
}

pack_file_for_mode() {
  case "$1" in
    monorepo) echo "$AI_DIR/opensrc-monorepo-pack.txt" ;;
    backend) echo "$AI_DIR/opensrc-backend-pack.txt" ;;
    frontend) echo "$AI_DIR/opensrc-frontend-pack.txt" ;;
    contracts) echo "$AI_DIR/opensrc-contracts-pack.txt" ;;
    protocol) echo "$AI_DIR/opensrc-protocol-pack.txt" ;;
    ai) echo "$AI_DIR/opensrc-ai-pack.txt" ;;
    full|all)
      local full_pack="$AI_DIR/opensrc-full-pack.txt"
      cat "$AI_DIR/opensrc-monorepo-pack.txt" \
        "$AI_DIR/opensrc-backend-pack.txt" \
        "$AI_DIR/opensrc-frontend-pack.txt" \
        "$AI_DIR/opensrc-contracts-pack.txt" \
        "$AI_DIR/opensrc-protocol-pack.txt" \
        "$AI_DIR/opensrc-ai-pack.txt" \
        | awk '/^[[:space:]]*$/ { next } /^[[:space:]]*#/ { next } !seen[$0]++ { print }' > "$full_pack"
      echo "$full_pack"
      ;;
    *)
      echo "ERROR: invalid mode: $1" >&2
      echo "Use one of: monorepo backend frontend contracts protocol ai full" >&2
      exit 1
      ;;
  esac
}

fetch_ref() {
  local ref="$1"

  echo ""
  echo "----"
  echo "Fetching: $ref"

  if opensrc fetch "$ref" 2>&1 | tee -a "$LOG_OUT"; then
    echo "Fetched: $ref"
    if path="$(opensrc path "$ref" 2>/dev/null)"; then
      echo "$ref => $path" | tee -a "$PATHS_OUT"
    else
      echo "$ref => fetched, but path lookup failed" | tee -a "$PATHS_OUT"
    fi
  else
    echo "FAILED: $ref" | tee -a "$FAILED_OUT"
  fi
}

if ! has_cmd git; then
  echo "ERROR: git not found. Install git first."
  exit 1
fi

if ! has_cmd npm; then
  echo "ERROR: npm not found. Install Node.js/npm first."
  exit 1
fi

install_ripgrep_if_possible
ensure_opensrc

opensrc --help >/dev/null

: > "$PATHS_OUT"
: > "$FAILED_OUT"
: > "$LOG_OUT"

PACK_FILE="$(pack_file_for_mode "$MODE")"
if [ ! -f "$PACK_FILE" ]; then
  echo "ERROR: pack file missing: $PACK_FILE"
  exit 1
fi

echo "==> RetroPick opensrc reference installer v2"
echo "==> Root: $ROOT_DIR"
echo "==> Mode: $MODE"
echo "==> Pack: $PACK_FILE"
echo "==> Log:  $LOG_OUT"

while IFS= read -r ref; do
  [[ -z "$ref" || "$ref" =~ ^[[:space:]]*# ]] && continue
  fetch_ref "$ref"
done < "$PACK_FILE"

echo ""
echo "========================================"
echo "RetroPick opensrc install done"
echo "========================================"
echo "Mode:         $MODE"
echo "Pack:         $PACK_FILE"
echo "Cached paths: $PATHS_OUT"
echo "Failed refs:  $FAILED_OUT"
echo "Log:          $LOG_OUT"
echo "Agent guide:  $AI_DIR/AGENTS-opensrc.md"
echo "Helper:       scripts/opensrc-rg.sh"

if [ -s "$FAILED_OUT" ]; then
  echo ""
  echo "Some refs failed. Check:"
  echo "  cat $FAILED_OUT"
else
  echo ""
  echo "All refs fetched successfully for mode: $MODE"
fi
