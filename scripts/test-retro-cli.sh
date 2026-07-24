#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RETRO="$ROOT/bin/retro"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

assert_help_from() {
  local cwd="${1:?}"
  (
    cd "$cwd"
    "$RETRO" contracts estimate --help >"$TMP/help.out"
  )
  grep -Fq -- "--rpc-url" "$TMP/help.out"
  grep -Fq -- "--color" "$TMP/help.out"
}

assert_help_from "$ROOT"
assert_help_from "$ROOT/contracts/legacy-pool-v1"
assert_help_from "$ROOT/apps/backend"

ln -s "$RETRO" "$TMP/retro"
(
  cd "$TMP"
  PATH="$TMP:$PATH" retro --help >"$TMP/path-help.out"
)
grep -Fq -- "costs estimate" "$TMP/path-help.out"
grep -Fq -- "stack prod" "$TMP/path-help.out"

echo "retro CLI cwd tests passed"
