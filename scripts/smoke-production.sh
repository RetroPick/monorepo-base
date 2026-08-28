#!/usr/bin/env bash
# Markets V1 production smoke — delegates to the canonical local stack smoke.
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec bash "$root/scripts/markets-dev-smoke.sh" "$@"
