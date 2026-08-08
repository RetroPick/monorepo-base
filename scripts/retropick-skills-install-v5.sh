#!/usr/bin/env bash
set -uo pipefail

###############################################################################
# RetroPick production-grade full-stack skills installer — v5
#
# Fresh implementation. It installs EVERY public skill found in every selected
# repository with the official skills CLI form:
#
#   npx --yes skills@latest add owner/repo \
#     --skill '*' --agent cursor --yes --copy
#
# Designed for RetroPick:
# - Solidity / Foundry / Base / wallet integration / contract security
# - Go API, indexer, keeper, workers, PostgreSQL, Redis, queues and workflows
# - Next.js / React / pnpm / Turborepo / Web3 frontend / accessibility / E2E
# - CI/CD, IaC, Docker/platform, supply-chain security, observability and SRE
# - Product analytics, feature flags, documentation, SDKs and Android/Kotlin
#
# Run from anywhere inside the RetroPick Git repository:
#
#   bash scripts/retropick-skills-install-v5.sh production-all
#
# Useful profiles:
#
#   official-only      Technology-maker repositories only
#   contracts          EVM, Base, wallet and smart-contract security
#   backend            Go, API, Postgres, Redis, queue, workflow and realtime
#   frontend           Next.js, React, monorepo, Web3 UX, accessibility and E2E
#   security           AppSec, contract security, secrets and supply chain
#   infra              CI/CD, IaC, platform, CDN/WAF and deployments
#   observability      Errors, logs, metrics, traces, SLOs and incidents
#   product            Analytics, feature flags, data and growth
#   mobile             Kotlin and Android
#   production-all     Complete curated RetroPick production profile
#   community-extra    Additional broad community repositories
#   everything-all     production-all + community-extra
#
# Utility commands:
#
#   list-profiles
#   list-repos [profile]
#   verify
#
# Environment controls:
#
#   AGENT=cursor
#   SKILLS_CLI_VERSION=latest
#   COPY_MODE=1
#   GLOBAL_MODE=0
#   PREFLIGHT=1
#   RETRIES=2
#   RETRY_DELAY_SECONDS=3
#   INSTALL_TIMEOUT_SECONDS=1200
#   MAX_REPOS=0
#   DRY_RUN=0
#   STRICT=0
#   INCLUDE_INTERNAL=0
#   DISABLE_TELEMETRY=1
#
###############################################################################

PROFILE="${1:-production-all}"
AGENT="${AGENT:-cursor}"
SKILLS_CLI_VERSION="${SKILLS_CLI_VERSION:-latest}"
COPY_MODE="${COPY_MODE:-1}"
GLOBAL_MODE="${GLOBAL_MODE:-0}"
PREFLIGHT="${PREFLIGHT:-1}"
RETRIES="${RETRIES:-2}"
RETRY_DELAY_SECONDS="${RETRY_DELAY_SECONDS:-3}"
INSTALL_TIMEOUT_SECONDS="${INSTALL_TIMEOUT_SECONDS:-1200}"
MAX_REPOS="${MAX_REPOS:-0}"
DRY_RUN="${DRY_RUN:-0}"
STRICT="${STRICT:-0}"
INCLUDE_INTERNAL="${INCLUDE_INTERNAL:-0}"

export DISABLE_TELEMETRY="${DISABLE_TELEMETRY:-1}"
export DO_NOT_TRACK="${DO_NOT_TRACK:-1}"

if [[ "$INCLUDE_INTERNAL" == "1" ]]; then
  export INSTALL_INTERNAL_SKILLS=1
fi

###############################################################################
# Locate repository root
###############################################################################

if ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"; then
  cd "$ROOT"
else
  echo "ERROR: run this script from inside the RetroPick Git repository." >&2
  exit 1
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
LOG_DIR="${LOG_DIR:-$ROOT/.skills-install-logs/$STAMP}"
mkdir -p "$LOG_DIR"

###############################################################################
# Single-process lock
###############################################################################

LOCK_FILE="$ROOT/.skills-install.lock"

if command -v flock >/dev/null 2>&1; then
  exec 9>"$LOCK_FILE"
  if ! flock -n 9; then
    echo "ERROR: another skills installer is already running." >&2
    echo "Lock: $LOCK_FILE" >&2
    exit 1
  fi
else
  LOCK_DIR_FALLBACK="$ROOT/.skills-install.lock.d"
  if ! mkdir "$LOCK_DIR_FALLBACK" 2>/dev/null; then
    echo "ERROR: another skills installer may already be running." >&2
    echo "Remove stale lock only after checking: $LOCK_DIR_FALLBACK" >&2
    exit 1
  fi
  trap 'rmdir "$LOCK_DIR_FALLBACK" 2>/dev/null || true' EXIT INT TERM
fi

###############################################################################
# Prerequisites
###############################################################################

require_command() {
  local command_name="$1"
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "ERROR: required command not found: $command_name" >&2
    exit 1
  fi
}

for required in git node npm npx find sort grep awk sed tee wc; do
  require_command "$required"
done

NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])' 2>/dev/null || echo 0)"
if [[ ! "$NODE_MAJOR" =~ ^[0-9]+$ ]] || (( NODE_MAJOR < 18 )); then
  echo "ERROR: Node.js 18 or newer is required. Current: $(node --version 2>/dev/null || echo unknown)" >&2
  exit 1
fi

if [[ ! "$RETRIES" =~ ^[1-9][0-9]*$ ]]; then
  echo "ERROR: RETRIES must be a positive integer." >&2
  exit 1
fi

if [[ ! "$MAX_REPOS" =~ ^[0-9]+$ ]]; then
  echo "ERROR: MAX_REPOS must be zero or a positive integer." >&2
  exit 1
fi

###############################################################################
# Repository groups
#
# production-all is intentionally curated. community-extra is separated because
# broad repositories can introduce unrelated frameworks and duplicate names.
###############################################################################

AGENT_WORKFLOW_REPOS=(
  "vercel-labs/skills"
  "anthropics/skills"
  "openai/skills"
  "github/awesome-copilot"
  "coderabbitai/skills"
  "getsentry/skills"
)

CONTRACT_REPOS=(
  "base/skills"
  "coinbase/agentic-wallet-skills"
  "trailofbits/skills"
  "semgrep/skills"
  "schwepps/skills"
  "wshobson/agents"
)

BACKEND_REPOS=(
  "googlecloudplatform/devrel-demos"
  "redis/agent-skills"
  "temporalio/skill-temporal-developer"
  "supabase/agent-skills"
  "neondatabase/agent-skills"
  "triggerdotdev/skills"
  "cosmix/loom"
  "speakeasy-api/skills"
  "speakeasy-api/agent-skills"
  "resend/resend-skills"
  "livekit/agent-skills"
  "mindrally/skills"
  "vasilyu1983/ai-agents-public"
  "agents-inc/skills"
  "wshobson/agents"
)

FRONTEND_REPOS=(
  "vercel-labs/agent-skills"
  "anthropics/skills"
  "facebook/react"
  "vercel/turborepo"
  "antfu/skills"
  "microsoft/playwright-cli"
  "microsoft/playwright"
  "addyosmani/web-quality-skills"
  "cloudflare/skills"
  "base/skills"
  "coinbase/agentic-wallet-skills"
)

SECURITY_REPOS=(
  "trailofbits/skills"
  "semgrep/skills"
  "openai/skills"
  "github/awesome-copilot"
  "coderabbitai/skills"
  "bitwarden/ai-plugins"
  "getsentry/skills"
)

INFRA_REPOS=(
  "pulumi/agent-skills"
  "hashicorp/agent-skills"
  "cloudflare/skills"
  "aws/agent-toolkit-for-aws"
  "github/awesome-copilot"
  "base/skills"
)

OBSERVABILITY_REPOS=(
  "getsentry/skills"
  "getsentry/sentry-agent-skills"
  "signoz/agent-skills"
  "axiomhq/skills"
  "datadog-labs/agent-skills"
  "dash0hq/agent-skills"
)

PRODUCT_REPOS=(
  "posthog/skills"
  "launchdarkly/agent-skills"
  "dbt-labs/dbt-agent-skills"
  "clickhouse/agent-skills"
  "tinybirdco/tinybird-agent-skills"
  "coreyhaines31/marketingskills"
)

MOBILE_REPOS=(
  "kotlin/kotlin-agent-skills"
)

# Technology-maker repositories used by the official-only profile.
OFFICIAL_REPOS=(
  "anthropics/skills"
  "openai/skills"
  "github/awesome-copilot"
  "coderabbitai/skills"
  "getsentry/skills"
  "getsentry/sentry-agent-skills"
  "base/skills"
  "coinbase/agentic-wallet-skills"
  "semgrep/skills"
  "redis/agent-skills"
  "temporalio/skill-temporal-developer"
  "supabase/agent-skills"
  "neondatabase/agent-skills"
  "triggerdotdev/skills"
  "resend/resend-skills"
  "livekit/agent-skills"
  "vercel-labs/agent-skills"
  "facebook/react"
  "vercel/turborepo"
  "microsoft/playwright-cli"
  "cloudflare/skills"
  "pulumi/agent-skills"
  "hashicorp/agent-skills"
  "aws/agent-toolkit-for-aws"
  "signoz/agent-skills"
  "axiomhq/skills"
  "datadog-labs/agent-skills"
  "dash0hq/agent-skills"
  "posthog/skills"
  "launchdarkly/agent-skills"
  "dbt-labs/dbt-agent-skills"
  "clickhouse/agent-skills"
  "tinybirdco/tinybird-agent-skills"
  "kotlin/kotlin-agent-skills"
)

COMMUNITY_EXTRA_REPOS=(
  "obra/superpowers"
  "mattpocock/skills"
  "addyosmani/agent-skills"
  "currents-dev/playwright-best-practices-skill"
  "teachingai/full-stack-skills"
  "patricio0312rev/skills"
  "secondsky/claude-skills"
  "affaan-m/everything-claude-code"
  "sickn33/antigravity-awesome-skills"
  "404kidwiz/claude-supercode-skills"
)

###############################################################################
# In-memory manifest — no installation loop runs inside a pipeline/subshell
###############################################################################

declare -a REPOS=()
declare -A REPO_SEEN=()

add_repo() {
  local repo="$1"
  [[ -z "$repo" ]] && return 0

  if [[ -z "${REPO_SEEN[$repo]+x}" ]]; then
    REPOS+=("$repo")
    REPO_SEEN["$repo"]=1
  fi
}

add_group() {
  local repo
  for repo in "$@"; do
    add_repo "$repo"
  done
}

reset_manifest() {
  REPOS=()
  REPO_SEEN=()
}

resolve_profile() {
  local requested="$1"
  reset_manifest

  case "$requested" in
    official-only)
      add_group "${OFFICIAL_REPOS[@]}"
      ;;

    agent-workflow)
      add_group "${AGENT_WORKFLOW_REPOS[@]}"
      ;;

    contracts)
      add_group "${AGENT_WORKFLOW_REPOS[@]}"
      add_group "${CONTRACT_REPOS[@]}"
      ;;

    backend)
      add_group "${AGENT_WORKFLOW_REPOS[@]}"
      add_group "${BACKEND_REPOS[@]}"
      add_group "${SECURITY_REPOS[@]}"
      add_group "${OBSERVABILITY_REPOS[@]}"
      ;;

    frontend)
      add_group "${AGENT_WORKFLOW_REPOS[@]}"
      add_group "${FRONTEND_REPOS[@]}"
      add_group "${SECURITY_REPOS[@]}"
      add_group "${OBSERVABILITY_REPOS[@]}"
      ;;

    security)
      add_group "${SECURITY_REPOS[@]}"
      add_group "${CONTRACT_REPOS[@]}"
      ;;

    infra)
      add_group "${INFRA_REPOS[@]}"
      add_group "${SECURITY_REPOS[@]}"
      add_group "${OBSERVABILITY_REPOS[@]}"
      ;;

    observability)
      add_group "${OBSERVABILITY_REPOS[@]}"
      ;;

    product)
      add_group "${PRODUCT_REPOS[@]}"
      ;;

    mobile)
      add_group "${MOBILE_REPOS[@]}"
      add_group "${SECURITY_REPOS[@]}"
      add_group "${OBSERVABILITY_REPOS[@]}"
      ;;

    production-all)
      add_group "${AGENT_WORKFLOW_REPOS[@]}"
      add_group "${CONTRACT_REPOS[@]}"
      add_group "${BACKEND_REPOS[@]}"
      add_group "${FRONTEND_REPOS[@]}"
      add_group "${SECURITY_REPOS[@]}"
      add_group "${INFRA_REPOS[@]}"
      add_group "${OBSERVABILITY_REPOS[@]}"
      add_group "${PRODUCT_REPOS[@]}"
      add_group "${MOBILE_REPOS[@]}"
      ;;

    community-extra)
      add_group "${COMMUNITY_EXTRA_REPOS[@]}"
      ;;

    everything-all)
      resolve_profile production-all
      add_group "${COMMUNITY_EXTRA_REPOS[@]}"
      ;;

    *)
      return 2
      ;;
  esac
}

print_profiles() {
  cat <<'EOF'
official-only
agent-workflow
contracts
backend
frontend
security
infra
observability
product
mobile
production-all
community-extra
everything-all
EOF
}

###############################################################################
# CLI execution helpers
###############################################################################

skills_cli() {
  npx --yes "skills@${SKILLS_CLI_VERSION}" "$@"
}

safe_name() {
  printf '%s' "$1" \
    | tr '/:@' '____' \
    | tr -cd '[:alnum:]_.-'
}

run_with_timeout() {
  if command -v timeout >/dev/null 2>&1 && (( INSTALL_TIMEOUT_SECONDS > 0 )); then
    timeout --signal=TERM --kill-after=30s "${INSTALL_TIMEOUT_SECONDS}s" "$@"
  else
    "$@"
  fi
}

build_install_command() {
  local repo="$1"

  INSTALL_COMMAND=(
    npx --yes "skills@${SKILLS_CLI_VERSION}"
    add "$repo"
    --skill "*"
    --agent "$AGENT"
    --yes
  )

  if [[ "$COPY_MODE" == "1" ]]; then
    INSTALL_COMMAND+=(--copy)
  fi

  if [[ "$GLOBAL_MODE" == "1" ]]; then
    INSTALL_COMMAND+=(--global)
  fi
}

###############################################################################
# Install state
###############################################################################

declare -a SUCCESS_REPOS=()
declare -a FAILED_REPOS=()
declare -a SKIPPED_REPOS=()

preflight_repo() {
  local repo="$1"
  local name
  name="$(safe_name "$repo")"
  local log_file="$LOG_DIR/${name}.list.log"

  if [[ "$PREFLIGHT" != "1" || "$DRY_RUN" == "1" ]]; then
    return 0
  fi

  echo "Preflight: $repo"

  run_with_timeout \
    npx --yes "skills@${SKILLS_CLI_VERSION}" \
    add "$repo" --list \
    >"$log_file" 2>&1

  local rc=$?
  if (( rc != 0 )); then
    echo "WARN: preflight list failed for $repo; installation will still be attempted." >&2
    echo "      Log: $log_file" >&2
  fi

  return 0
}

install_repo() {
  local repo="$1"
  local name
  name="$(safe_name "$repo")"
  local log_file="$LOG_DIR/${name}.install.log"

  preflight_repo "$repo"
  build_install_command "$repo"

  echo
  echo "================================================================"
  echo "Repository: $repo"
  echo "Installing: every public skill"
  echo "Agent:      $AGENT"
  echo "Log:        $log_file"
  echo "================================================================"

  if [[ "$DRY_RUN" == "1" ]]; then
    printf 'DRY RUN: '
    printf '%q ' "${INSTALL_COMMAND[@]}"
    printf '\n'
    SUCCESS_REPOS+=("$repo [dry-run]")
    return 0
  fi

  local attempt rc
  : >"$log_file"

  for ((attempt = 1; attempt <= RETRIES; attempt++)); do
    echo "Attempt $attempt/$RETRIES" | tee -a "$log_file"

    run_with_timeout "${INSTALL_COMMAND[@]}" 2>&1 | tee -a "$log_file"
    rc=${PIPESTATUS[0]}

    if (( rc == 0 )); then
      SUCCESS_REPOS+=("$repo")
      return 0
    fi

    echo "Attempt $attempt failed with exit code $rc." | tee -a "$log_file" >&2

    if (( attempt < RETRIES )); then
      sleep "$RETRY_DELAY_SECONDS"
    fi
  done

  FAILED_REPOS+=("$repo (exit $rc; $log_file)")
  return 0
}

###############################################################################
# Verification and reporting
###############################################################################

write_manifest() {
  local manifest_file="$LOG_DIR/${PROFILE}.repositories.txt"
  printf '%s\n' "${REPOS[@]}" >"$manifest_file"
  echo "$manifest_file"
}

write_inventory() {
  local dirs_file="$LOG_DIR/installed-skill-directories.txt"
  local files_file="$LOG_DIR/installed-skill-files.txt"

  if [[ "$GLOBAL_MODE" == "1" ]]; then
    find "$HOME/.cursor/skills" \
      -mindepth 1 -maxdepth 1 -type d -printf '%f\n' \
      2>/dev/null | sort -u >"$dirs_file" || true

    find "$HOME/.cursor/skills" \
      -mindepth 2 -maxdepth 2 -name SKILL.md -type f \
      2>/dev/null | sort -u >"$files_file" || true
  else
    find "$ROOT/.agents/skills" \
      -mindepth 1 -maxdepth 1 -type d -printf '%f\n' \
      2>/dev/null | sort -u >"$dirs_file" || true

    find "$ROOT/.agents/skills" \
      -mindepth 2 -maxdepth 2 -name SKILL.md -type f \
      2>/dev/null | sort -u >"$files_file" || true
  fi
}

verify_installation() {
  echo
  echo "skills CLI:"
  skills_cli --version || true

  echo
  echo "Installed skills visible to Cursor:"
  skills_cli list --agent "$AGENT" || true

  local skill_root
  if [[ "$GLOBAL_MODE" == "1" ]]; then
    skill_root="$HOME/.cursor/skills"
  else
    skill_root="$ROOT/.agents/skills"
  fi

  local directory_count=0
  local skill_file_count=0

  if [[ -d "$skill_root" ]]; then
    directory_count="$(
      find "$skill_root" -mindepth 1 -maxdepth 1 -type d 2>/dev/null \
        | wc -l \
        | tr -d ' '
    )"

    skill_file_count="$(
      find "$skill_root" -mindepth 2 -maxdepth 2 -name SKILL.md -type f 2>/dev/null \
        | wc -l \
        | tr -d ' '
    )"
  fi

  echo
  echo "Skill root:        $skill_root"
  echo "Skill directories: $directory_count"
  echo "SKILL.md files:    $skill_file_count"

  echo
  echo "RetroPick domain matches:"
  find "$skill_root" \
    -mindepth 1 -maxdepth 1 -type d -printf '%f\n' \
    2>/dev/null \
    | grep -Ei \
      'solidity|foundry|evm|base|web3|wallet|contract|audit|go|golang|api|openapi|sdk|postgres|database|sql|redis|cache|queue|job|temporal|workflow|websocket|realtime|next|react|typescript|pnpm|turbo|playwright|accessibility|performance|security|secret|supply|docker|terraform|pulumi|cloudflare|sentry|observability|otel|metric|trace|incident|analytics|feature|kotlin|android' \
    | sort -u \
    || true
}

print_summary() {
  write_inventory

  echo
  echo "################################################################"
  echo "INSTALL SUMMARY"
  echo "################################################################"
  echo "Profile:              $PROFILE"
  echo "Repository root:      $ROOT"
  echo "Agent:                $AGENT"
  echo "Skills CLI version:   $SKILLS_CLI_VERSION"
  echo "Scope:                $([[ "$GLOBAL_MODE" == "1" ]] && echo global || echo project)"
  echo "Installation method:  $([[ "$COPY_MODE" == "1" ]] && echo copy || echo symlink)"
  echo "Resolved repositories:${#REPOS[@]}"
  echo "Successful:           ${#SUCCESS_REPOS[@]}"
  echo "Failed:               ${#FAILED_REPOS[@]}"
  echo "Skipped:              ${#SKIPPED_REPOS[@]}"
  echo "Logs:                 $LOG_DIR"

  if ((${#FAILED_REPOS[@]} > 0)); then
    echo
    echo "Failed repositories:"
    printf '  - %s\n' "${FAILED_REPOS[@]}"
  fi

  if ((${#SKIPPED_REPOS[@]} > 0)); then
    echo
    echo "Skipped repositories:"
    printf '  - %s\n' "${SKIPPED_REPOS[@]}"
  fi

  verify_installation

  if [[ "$STRICT" == "1" ]] && ((${#FAILED_REPOS[@]} > 0)); then
    return 1
  fi

  return 0
}

###############################################################################
# Entrypoint
###############################################################################

case "$PROFILE" in
  list-profiles)
    print_profiles
    exit 0
    ;;

  list-repos)
    TARGET_PROFILE="${2:-production-all}"

    if ! resolve_profile "$TARGET_PROFILE"; then
      echo "ERROR: unknown profile: $TARGET_PROFILE" >&2
      echo "Available profiles:" >&2
      print_profiles >&2
      exit 2
    fi

    printf '%s\n' "${REPOS[@]}"
    exit 0
    ;;

  verify)
    verify_installation
    exit 0
    ;;

  official-only|agent-workflow|contracts|backend|frontend|security|infra|observability|product|mobile|production-all|community-extra|everything-all)
    if ! resolve_profile "$PROFILE"; then
      echo "ERROR: unable to resolve profile: $PROFILE" >&2
      exit 2
    fi
    ;;

  *)
    echo "ERROR: unknown profile: $PROFILE" >&2
    echo "Available profiles:" >&2
    print_profiles >&2
    exit 2
    ;;
esac

if ((${#REPOS[@]} == 0)); then
  echo "ERROR: profile resolved to zero repositories." >&2
  exit 1
fi

MANIFEST_FILE="$(write_manifest)"

echo "RetroPick skills installer v5"
echo "Profile:      $PROFILE"
echo "Repositories: ${#REPOS[@]}"
echo "Manifest:     $MANIFEST_FILE"
echo "Agent:        $AGENT"
echo "Scope:        $([[ "$GLOBAL_MODE" == "1" ]] && echo global || echo project)"
echo

processed=0
for repo in "${REPOS[@]}"; do
  if (( MAX_REPOS > 0 && processed >= MAX_REPOS )); then
    SKIPPED_REPOS+=("$repo [MAX_REPOS=$MAX_REPOS]")
    continue
  fi

  processed=$((processed + 1))
  install_repo "$repo"
done

print_summary
