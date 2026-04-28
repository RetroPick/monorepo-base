#!/usr/bin/env bash
# Wrapper: run from monorepo root (V1). Delegates to package/contract.
set -euo pipefail
_WRAP="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
V1_ROOT="$(cd "$_WRAP/../.." && pwd)"
exec "$V1_ROOT/package/contract/scripts/market/prepare-upsert-template.sh" "$@"
