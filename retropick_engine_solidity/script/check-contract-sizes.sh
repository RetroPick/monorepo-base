#!/usr/bin/env bash
# Enforce EIP-170 (24576 B runtime) headroom for MarketEngine on *deployable* compiler profiles.
# `production` (optimizer_runs=1M) often exceeds EIP-170 for MarketEngine — do not deploy that artifact.
# Run: ./script/check-contract-sizes.sh
# Override: MIN_HEADROOM=512 ./script/check-contract-sizes.sh
set -euo pipefail

readonly EIP170_RUNTIME_LIMIT=24576
readonly MIN_HEADROOM="${MIN_HEADROOM:-384}"
readonly DEPLOY_PROFILES=(default deploybudget)

parse_runtime() {
  local output="$1"
  local line
  line="$(echo "${output}" | grep '| MarketEngine' | head -1 || true)"
  if [[ -z "${line}" ]]; then
    echo "ERROR: Could not find MarketEngine row in forge build --sizes output"
    return 1
  fi
  local runtime_str
  runtime_str="$(echo "${line}" | awk -F'|' '{print $3}' | tr -d ' ,\t')"
  if [[ -z "${runtime_str}" ]] || ! [[ "${runtime_str}" =~ ^[0-9]+$ ]]; then
    echo "ERROR: Failed to parse runtime size from: ${line}"
    return 1
  fi
  echo "${runtime_str}"
}

for profile in "${DEPLOY_PROFILES[@]}"; do
  echo "========== FOUNDRY_PROFILE=${profile} (deploy gate) =========="
  if ! output="$(FOUNDRY_PROFILE="${profile}" forge build --sizes 2>&1)"; then
    echo "${output}"
    echo "ERROR: forge build --sizes failed for profile ${profile}"
    exit 1
  fi
  echo "${output}"

  runtime="$(parse_runtime "${output}")"
  headroom=$((EIP170_RUNTIME_LIMIT - runtime))
  echo "MarketEngine runtime: ${runtime} B, EIP-170 headroom: ${headroom} B (min required: ${MIN_HEADROOM} B)"

  if ((runtime > EIP170_RUNTIME_LIMIT)); then
    echo "ERROR: MarketEngine runtime exceeds EIP-170 limit (${EIP170_RUNTIME_LIMIT} B)"
    exit 1
  fi
  if ((headroom < MIN_HEADROOM)); then
    echo "ERROR: Headroom ${headroom} B < MIN_HEADROOM ${MIN_HEADROOM} B — see DEPLOYMENT_AND_EPOCHS.md (Phase C)"
    exit 1
  fi
done

echo "========== FOUNDRY_PROFILE=production (informational only) =========="
set +e
prod_out="$(FOUNDRY_PROFILE=production forge build --sizes 2>&1)"
prod_rc=$?
set -e
echo "${prod_out}"
if ((prod_rc != 0)); then
  echo "NOTE: production profile build failed (typical: MarketEngine > EIP-170 at optimizer_runs=1M). Do not deploy that artifact."
  echo "      Ship MarketEngine with default or deploybudget; production is for runtime-gas experiments / non-size-limited targets."
else
  runtime="$(parse_runtime "${prod_out}")" || true
  if [[ -n "${runtime:-}" ]]; then
    headroom=$((EIP170_RUNTIME_LIMIT - runtime))
    echo "MarketEngine runtime: ${runtime} B, headroom: ${headroom} B"
    if ((runtime > EIP170_RUNTIME_LIMIT)); then
      echo "WARN: production profile exceeds EIP-170 — do not deploy MarketEngine from this profile."
    fi
  fi
fi

echo "OK: Deployable profiles (default, deploybudget) pass MarketEngine size gate."
