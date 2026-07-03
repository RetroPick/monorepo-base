#!/usr/bin/env bash
# Base Sepolia smoke wrapper — sets API base from env or default local stack.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export RETROPICK_API_BASE="${RETROPICK_API_BASE:-http://127.0.0.1:8080}"
exec "$ROOT/scripts/smoke-production.sh"
