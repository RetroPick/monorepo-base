#!/usr/bin/env bash
# Shared dotenv loader for repository-owned operator scripts.

load_repo_env() {
  local file="${1:?env file is required}"
  [[ -f "$file" ]] || return 0
  set -a
  # shellcheck disable=SC1090
  source "$file"
  set +a
}
