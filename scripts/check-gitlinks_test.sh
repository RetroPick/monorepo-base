#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHECK="${ROOT}/scripts/check-gitlinks.sh"

run_case() {
  local name="$1"
  local expect="$2"
  shift 2
  local dir
  dir="$(mktemp -d)"
  trap 'rm -rf "$dir"' RETURN
  (
    cd "$dir"
    git init -q
    git config user.email "test@example.com"
    git config user.name "test"
    "$@"
    set +e
    output="$("$CHECK" 2>&1)"
    status=$?
    set -e
    if [[ "$expect" == "pass" && "$status" -ne 0 ]]; then
      echo "case $name: expected pass got exit $status output=$output" >&2
      exit 1
    fi
    if [[ "$expect" == "fail" && "$status" -eq 0 ]]; then
      echo "case $name: expected fail got exit 0 output=$output" >&2
      exit 1
    fi
  )
}

run_case "no gitlinks pass" pass true

run_case "registered gitlink pass" pass bash -c '
  cat > .gitmodules <<EOF
[submodule "active"]
  path = packages/active
  url = https://example.com/active.git
EOF
  mkdir -p packages/active
  git submodule add --force https://example.com/active.git packages/active 2>/dev/null || {
    git update-index --add --cacheinfo 160000,deadbeefdeadbeefdeadbeefdeadbeefdeadbeef,packages/active
  }
  git add .gitmodules packages/active
'

run_case "allowlisted archive gitlink pass" pass bash -c '
  git update-index --add --cacheinfo 160000,deadbeefdeadbeefdeadbeefdeadbeefdeadbeef,archive/contracts/legacy-pool-v1/treasury-vault-eth
'

run_case "unknown archive gitlink fail" fail bash -c '
  git update-index --add --cacheinfo 160000,deadbeefdeadbeefdeadbeefdeadbeefdeadbeef,archive/other/unknown
'

run_case "unknown non-archive gitlink fail" fail bash -c '
  git update-index --add --cacheinfo 160000,deadbeefdeadbeefdeadbeefdeadbeefdeadbeef,apps/rogue
'

run_case "missing gitmodules non-allowlisted fail" fail bash -c '
  git update-index --add --cacheinfo 160000,deadbeefdeadbeefdeadbeefdeadbeefdeadbeef,apps/rogue
'

echo "check-gitlinks tests passed"
