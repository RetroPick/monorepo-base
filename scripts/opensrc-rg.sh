#!/usr/bin/env bash
set -euo pipefail

REF="${1:-}"
QUERY="${2:-}"

if [ -z "$REF" ] || [ -z "$QUERY" ]; then
  echo "Usage: $0 <opensrc-ref> <query>"
  exit 1
fi

if ! command -v opensrc >/dev/null 2>&1; then
  echo "opensrc not found."
  exit 1
fi

if ! command -v rg >/dev/null 2>&1; then
  echo "rg/ripgrep not found."
  exit 1
fi

PATH_TO_REF="$(opensrc path "$REF")"

echo "==> Searching in: $REF"
echo "==> Path: $PATH_TO_REF"
echo "==> Query: $QUERY"
echo ""

rg -n --hidden --glob '!node_modules' --glob '!dist' --glob '!build' --glob '!target' "$QUERY" "$PATH_TO_REF"
