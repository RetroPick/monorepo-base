#!/usr/bin/env bash
set -euo pipefail

# Fail when gitlinks exist without a matching .gitmodules registration.
mapfile -t gitlinks < <(git ls-files --stage | awk '$1 == "160000" { print $4 }')
if ((${#gitlinks[@]} == 0)); then
  exit 0
fi

has_gitmodules=0
if [[ -f .gitmodules ]]; then
  has_gitmodules=1
fi

failed=0
for path in "${gitlinks[@]}"; do
  if [[ "$path" == archive/* ]]; then
    echo "known archived gitlink (documented, non-blocking): $path" >&2
    continue
  fi
  if ((has_gitmodules == 0)); then
    echo "unregistered gitlink without .gitmodules: $path" >&2
    failed=1
    continue
  fi
  if ! git config --file .gitmodules --get-regexp "path" | awk '{ print $2 }' | grep -Fxq "$path"; then
    echo "unregistered gitlink: $path" >&2
    failed=1
  fi
done
exit "$failed"
