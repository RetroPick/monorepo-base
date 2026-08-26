#!/usr/bin/env bash
set -euo pipefail

needle='Current Markets V1 authority:'

# Historical reconciliation evidence may retain migration wording. Current
# developer/product documentation must not contain the mechanical rewrite
# placeholder produced during the legacy purge.
violations="$({
  git grep -nF "$needle" -- '*.md' \
    ':(exclude,glob).harness/products/markets-v1/evidence/reconciliation/**' \
    ':(exclude,glob).references/**' || true
} )"

if [[ -n "$violations" ]]; then
  echo 'Mechanical Markets V1 authority placeholders remain in current documentation:' >&2
  printf '%s\n' "$violations" >&2
  echo >&2
  echo 'Rewrite or remove the affected current prose/table/list entries semantically; do not restore retired architecture.' >&2
  exit 1
fi

echo 'Markets V1 documentation coherence placeholder check passed.'
