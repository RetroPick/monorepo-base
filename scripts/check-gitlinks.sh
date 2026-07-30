#!/usr/bin/env bash
set -euo pipefail

# Fail when gitlinks exist without a matching .gitmodules registration.
# Only explicitly reviewed paths may bypass registration.
readonly -a ALLOWLISTED_UNREGISTERED_GITLINKS=(
  # Legacy treasury vault contract snapshot; archived and not required for Markets CI.
  "archive/contracts/legacy-pool-v1/treasury-vault-eth"
)

mapfile -t gitlinks < <(git ls-files --stage | awk '$1 == "160000" { print $4 }')
if ((${#gitlinks[@]} == 0)); then
  exit 0
fi

has_gitmodules=0
if [[ -f .gitmodules ]]; then
  has_gitmodules=1
fi

is_allowlisted() {
  local path="$1"
  local allowed
  for allowed in "${ALLOWLISTED_UNREGISTERED_GITLINKS[@]}"; do
    if [[ "$path" == "$allowed" ]]; then
      return 0
    fi
  done
  return 1
}

failed=0
for path in "${gitlinks[@]}"; do
  if is_allowlisted "$path"; then
    echo "allowlisted unregistered gitlink (reviewed): $path" >&2
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
