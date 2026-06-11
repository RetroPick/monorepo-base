#!/usr/bin/env bash
# Compatibility entry point for the repository-owned RETRODEPLOYER pipeline.
set -euo pipefail
_WRAP="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
V1_ROOT="$(cd "$_WRAP/../../.." && pwd)"
exec "$V1_ROOT/scripts/RETRODEPLOYER" launch "$@"
