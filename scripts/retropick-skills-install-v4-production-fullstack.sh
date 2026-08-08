#!/usr/bin/env bash
set -uo pipefail

# RetroPick Production Full-Stack skills.sh installer v4
#
# Installs EVERY PUBLIC SKILL from every repository selected by a profile:
#   npx --yes skills@<version> add <owner/repo> --skill '*' -a cursor -y --copy
#
# Default profile:
#   production-all
#
# Major profiles:
#   official-core       First-party / maker repositories only
#   contracts           Solidity, Base, EVM, oracle and contract security
#   backend             Go, API, Postgres, Redis, queues, workflows, realtime
#   frontend            Next.js, React, TypeScript, wallet UX, design, a11y, perf
#   quality-security    testing, review, AppSec, fuzzing, supply chain
#   infra-sre           Docker, IaC, proxy/CDN, CI/CD, SRE, backup and incidents
#   observability       logs, metrics, traces, dashboards, alerting
#   mobile              Kotlin/Android and mobile testing
#   docs-release        OpenAPI, SDKs, docs, changelog and release workflows
#   product             analytics, feature flags, email and growth
#   production-all      all production-relevant repositories above
#   community-extra     broad community collections (optional, noisy)
#   everything-all      production-all + community-extra
#
# Other commands:
#   list-profiles
#   list-repos <profile>
#   verify
#
# Environment variables:
#   AGENT=cursor
#   SKILLS_CLI_VERSION=1.5.19
#   COPY_MODE=1
#   GLOBAL_MODE=0
#   INCLUDE_INTERNAL=0
#   PREFLIGHT_LIST=1
#   DRY_RUN=0
#   STRICT=0
#   MAX_REPOS=0
#   ROOT_MODE=auto       auto | cwd
#   LOG_DIR=.skills-install-logs/<timestamp>
#
# Examples:
#   bash scripts/retropick-skills-install-v4-production-fullstack.sh production-all
#   DRY_RUN=1 bash scripts/retropick-skills-install-v4-production-fullstack.sh frontend
#   MAX_REPOS=3 bash scripts/retropick-skills-install-v4-production-fullstack.sh production-all

PROFILE="${1:-production-all}"
AGENT="${AGENT:-cursor}"
SKILLS_CLI_VERSION="${SKILLS_CLI_VERSION:-1.5.19}"
COPY_MODE="${COPY_MODE:-1}"
GLOBAL_MODE="${GLOBAL_MODE:-0}"
INCLUDE_INTERNAL="${INCLUDE_INTERNAL:-0}"
PREFLIGHT_LIST="${PREFLIGHT_LIST:-1}"
DRY_RUN="${DRY_RUN:-0}"
STRICT="${STRICT:-0}"
MAX_REPOS="${MAX_REPOS:-0}"
ROOT_MODE="${ROOT_MODE:-auto}"

export DISABLE_TELEMETRY="${DISABLE_TELEMETRY:-1}"
export DO_NOT_TRACK="${DO_NOT_TRACK:-1}"

if [[ "$INCLUDE_INTERNAL" == "1" ]]; then
  export INSTALL_INTERNAL_SKILLS=1
fi

if [[ "$ROOT_MODE" == "auto" ]] && git rev-parse --show-toplevel >/dev/null 2>&1; then
  cd "$(git rev-parse --show-toplevel)"
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
LOG_DIR="${LOG_DIR:-.skills-install-logs/$STAMP}"
mkdir -p "$LOG_DIR"

LOCK_DIR=".skills-install.lock"
if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  echo "ERROR: another skills installation may be running: $LOCK_DIR" >&2
  exit 1
fi
cleanup() {
  rmdir "$LOCK_DIR" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

SUCCESS_REPOS=()
FAILED_REPOS=()
SKIPPED_REPOS=()

# -----------------------------------------------------------------------------
# Repository manifests
#
# Every public skill in every listed repository is installed. Repositories are
# grouped by production responsibility, not only by programming language.
# -----------------------------------------------------------------------------

AGENT_WORKFLOW_REPOS=(
  "vercel-labs/skills"
  "openai/skills"
  "anthropics/skills"
  "obra/superpowers"
  "mattpocock/skills"
  "getsentry/skills"
  "coderabbitai/skills"
  "github/awesome-copilot"
)

CONTRACT_EVM_REPOS=(
  "base/skills"
  "coinbase/agentic-wallet-skills"
  "trailofbits/skills"
  "semgrep/skills"
  "openai/skills"
  "schwepps/skills"
  "vasilyu1983/ai-agents-public"
  "affaan-m/everything-claude-code"
)

BACKEND_GO_API_REPOS=(
  "googlecloudplatform/devrel-demos"
  "jeffallan/claude-skills"
  "cxuu/golang-skills"
  "vasilyu1983/ai-agents-public"
  "wshobson/agents"
  "mindrally/skills"
  "secondsky/claude-skills"
  "patricio0312rev/skills"
  "itechmeat/llm-code"
  "speakeasy-api/skills"
)

DATA_CACHE_WORKFLOW_REPOS=(
  "supabase/agent-skills"
  "redis/agent-skills"
  "temporalio/skill-temporal-developer"
  "cosmix/loom"
  "triggerdotdev/skills"
  "dbt-labs/dbt-agent-skills"
  "clickhouse/agent-skills"
  "tinybirdco/tinybird-agent-skills"
)

REALTIME_NOTIFICATION_REPOS=(
  "jeffallan/claude-skills"
  "agents-inc/skills"
  "resend/resend-skills"
  "livekit/agent-skills"
)

FRONTEND_CORE_REPOS=(
  "vercel-labs/agent-skills"
  "facebook/react"
  "vercel/turborepo"
  "antfu/skills"
  "mattpocock/skills"
  "mindrally/skills"
  "wshobson/agents"
  "agents-inc/skills"
  "base/skills"
  "coinbase/agentic-wallet-skills"
)

FRONTEND_QUALITY_DESIGN_REPOS=(
  "cloudflare/skills"
  "addyosmani/web-quality-skills"
  "community-access/accessibility-agents"
  "microsoft/playwright-cli"
  "currents-dev/playwright-best-practices-skill"
  "lambdatest/agent-skills"
  "dalestudy/skills"
  "xfstudio/skills"
  "thedesignproject/agent-skills"
  "supercent-io/skills-template"
)

SECURITY_SUPPLY_CHAIN_REPOS=(
  "trailofbits/skills"
  "semgrep/skills"
  "openai/skills"
  "github/awesome-copilot"
  "getsentry/skills"
  "coderabbitai/skills"
  "superagent-ai/skills"
  "borghei/claude-skills"
  "secondsky/claude-skills"
  "patricio0312rev/skills"
  "bitwarden/ai-plugins"
)

INFRA_PLATFORM_REPOS=(
  "pulumi/agent-skills"
  "hashicorp/agent-skills"
  "cloudflare/skills"
  "aws/agent-toolkit-for-aws"
  "github/awesome-copilot"
  "wshobson/agents"
  "cosmix/loom"
  "patricio0312rev/skills"
  "teachingai/full-stack-skills"
  "rand/cc-polymath"
  "base/skills"
)

OBSERVABILITY_REPOS=(
  "getsentry/skills"
  "signoz/agent-skills"
  "axiomhq/skills"
  "datadog-labs/agent-skills"
  "dash0hq/agent-skills"
  "elastic/agent-skills"
  "cosmix/loom"
  "cloudflare/skills"
)

MOBILE_ANDROID_REPOS=(
  "kotlin/kotlin-agent-skills"
  "mindrally/skills"
  "lambdatest/agent-skills"
)

DOCS_RELEASE_REPOS=(
  "github/awesome-copilot"
  "getsentry/skills"
  "wshobson/agents"
  "speakeasy-api/skills"
  "itechmeat/llm-code"
  "skillcreatorai/ai-agent-skills"
  "secondsky/claude-skills"
  "vercel/turborepo"
  "antfu/skills"
)

PRODUCT_ANALYTICS_REPOS=(
  "posthog/posthog-for-claude"
  "launchdarkly/agent-skills"
  "resend/resend-skills"
  "coreyhaines31/marketingskills"
  "dbt-labs/dbt-agent-skills"
  "clickhouse/agent-skills"
  "tinybirdco/tinybird-agent-skills"
)

# Broad repositories can contain unrelated languages/frameworks. They are kept
# outside production-all and are installed only via community-extra/everything-all.
COMMUNITY_EXTRA_REPOS=(
  "sickn33/antigravity-awesome-skills"
  "404kidwiz/claude-supercode-skills"
  "bobmatnyc/claude-mpm-skills"
  "aj-geddes/useful-ai-prompts"
  "jeremylongshore/claude-code-plugins-plus-skills"
  "alirezarezvani/claude-skills"
  "erichowens/some_claude_skills"
  "supercent-io/skills-template"
)

# Repositories treated as first-party / technology-maker sources.
OFFICIAL_CORE_REPOS=(
  "vercel-labs/skills"
  "vercel-labs/agent-skills"
  "vercel/turborepo"
  "facebook/react"
  "openai/skills"
  "anthropics/skills"
  "github/awesome-copilot"
  "coderabbitai/skills"
  "base/skills"
  "coinbase/agentic-wallet-skills"
  "cloudflare/skills"
  "redis/agent-skills"
  "temporalio/skill-temporal-developer"
  "supabase/agent-skills"
  "semgrep/skills"
  "getsentry/skills"
  "pulumi/agent-skills"
  "hashicorp/agent-skills"
  "microsoft/playwright-cli"
  "posthog/posthog-for-claude"
  "launchdarkly/agent-skills"
  "resend/resend-skills"
  "kotlin/kotlin-agent-skills"
  "signoz/agent-skills"
  "axiomhq/skills"
  "datadog-labs/agent-skills"
  "dash0hq/agent-skills"
  "dbt-labs/dbt-agent-skills"
  "clickhouse/agent-skills"
  "tinybirdco/tinybird-agent-skills"
  "bitwarden/ai-plugins"
)

# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------

require_tools() {
  local missing=0
  for tool in node npm npx git awk sed grep find sort tee; do
    if ! command -v "$tool" >/dev/null 2>&1; then
      echo "ERROR: required command not found: $tool" >&2
      missing=1
    fi
  done
  (( missing == 0 )) || exit 1
}

safe_log_name() {
  printf '%s' "$1" | tr '/:@' '____' | tr -cd '[:alnum:]_.-'
}

unique_repos() {
  awk 'NF && !seen[$0]++'
}

profile_repos() {
  local profile="$1"
  case "$profile" in
    official-core)
      printf '%s\n' "${OFFICIAL_CORE_REPOS[@]}"
      ;;
    agent-workflow)
      printf '%s\n' "${AGENT_WORKFLOW_REPOS[@]}"
      ;;
    contracts)
      printf '%s\n' "${CONTRACT_EVM_REPOS[@]}"
      ;;
    backend)
      {
        printf '%s\n' "${AGENT_WORKFLOW_REPOS[@]}"
        printf '%s\n' "${BACKEND_GO_API_REPOS[@]}"
        printf '%s\n' "${DATA_CACHE_WORKFLOW_REPOS[@]}"
        printf '%s\n' "${REALTIME_NOTIFICATION_REPOS[@]}"
        printf '%s\n' "${SECURITY_SUPPLY_CHAIN_REPOS[@]}"
        printf '%s\n' "${OBSERVABILITY_REPOS[@]}"
      } | unique_repos
      ;;
    frontend)
      {
        printf '%s\n' "${AGENT_WORKFLOW_REPOS[@]}"
        printf '%s\n' "${FRONTEND_CORE_REPOS[@]}"
        printf '%s\n' "${FRONTEND_QUALITY_DESIGN_REPOS[@]}"
        printf '%s\n' "${SECURITY_SUPPLY_CHAIN_REPOS[@]}"
        printf '%s\n' "${PRODUCT_ANALYTICS_REPOS[@]}"
      } | unique_repos
      ;;
    quality-security)
      {
        printf '%s\n' "${AGENT_WORKFLOW_REPOS[@]}"
        printf '%s\n' "${FRONTEND_QUALITY_DESIGN_REPOS[@]}"
        printf '%s\n' "${SECURITY_SUPPLY_CHAIN_REPOS[@]}"
      } | unique_repos
      ;;
    infra-sre)
      {
        printf '%s\n' "${INFRA_PLATFORM_REPOS[@]}"
        printf '%s\n' "${OBSERVABILITY_REPOS[@]}"
        printf '%s\n' "${SECURITY_SUPPLY_CHAIN_REPOS[@]}"
      } | unique_repos
      ;;
    observability)
      printf '%s\n' "${OBSERVABILITY_REPOS[@]}" | unique_repos
      ;;
    mobile)
      printf '%s\n' "${MOBILE_ANDROID_REPOS[@]}" | unique_repos
      ;;
    docs-release)
      printf '%s\n' "${DOCS_RELEASE_REPOS[@]}" | unique_repos
      ;;
    product)
      printf '%s\n' "${PRODUCT_ANALYTICS_REPOS[@]}" | unique_repos
      ;;
    community-extra)
      printf '%s\n' "${COMMUNITY_EXTRA_REPOS[@]}" | unique_repos
      ;;
    production-all)
      {
        printf '%s\n' "${AGENT_WORKFLOW_REPOS[@]}"
        printf '%s\n' "${CONTRACT_EVM_REPOS[@]}"
        printf '%s\n' "${BACKEND_GO_API_REPOS[@]}"
        printf '%s\n' "${DATA_CACHE_WORKFLOW_REPOS[@]}"
        printf '%s\n' "${REALTIME_NOTIFICATION_REPOS[@]}"
        printf '%s\n' "${FRONTEND_CORE_REPOS[@]}"
        printf '%s\n' "${FRONTEND_QUALITY_DESIGN_REPOS[@]}"
        printf '%s\n' "${SECURITY_SUPPLY_CHAIN_REPOS[@]}"
        printf '%s\n' "${INFRA_PLATFORM_REPOS[@]}"
        printf '%s\n' "${OBSERVABILITY_REPOS[@]}"
        printf '%s\n' "${MOBILE_ANDROID_REPOS[@]}"
        printf '%s\n' "${DOCS_RELEASE_REPOS[@]}"
        printf '%s\n' "${PRODUCT_ANALYTICS_REPOS[@]}"
      } | unique_repos
      ;;
    everything-all)
      {
        profile_repos production-all
        printf '%s\n' "${COMMUNITY_EXTRA_REPOS[@]}"
      } | unique_repos
      ;;
    *)
      return 2
      ;;
  esac
}

build_common_args() {
  COMMON_ARGS=("-a" "$AGENT" "-y" "--skill" "*")
  if [[ "$COPY_MODE" == "1" ]]; then
    COMMON_ARGS+=("--copy")
  fi
  if [[ "$GLOBAL_MODE" == "1" ]]; then
    COMMON_ARGS+=("-g")
  fi
}

skills_cli() {
  npx --yes "skills@${SKILLS_CLI_VERSION}" "$@"
}

preflight_repo() {
  local repo="$1"
  local base
  base="$(safe_log_name "$repo")"
  local list_file="$LOG_DIR/${base}.available-skills.txt"

  if [[ "$PREFLIGHT_LIST" != "1" || "$DRY_RUN" == "1" ]]; then
    return 0
  fi

  echo "Discovering skills in $repo ..."
  if skills_cli add "$repo" --list >"$list_file" 2>&1; then
    return 0
  fi

  echo "WARN: unable to list skills for $repo; install will still be attempted." >&2
  return 0
}

install_repo_all() {
  local repo="$1"
  local base
  base="$(safe_log_name "$repo")"
  local log_file="$LOG_DIR/${base}.install.log"

  preflight_repo "$repo"
  build_common_args
  local cmd=(npx --yes "skills@${SKILLS_CLI_VERSION}" add "$repo" "${COMMON_ARGS[@]}")

  echo
  echo "================================================================"
  echo "Installing every public skill from: $repo"
  echo "Command: ${cmd[*]}"
  echo "Log: $log_file"
  echo "================================================================"

  if [[ "$DRY_RUN" == "1" ]]; then
    printf '%q ' "${cmd[@]}"
    printf '\n'
    SUCCESS_REPOS+=("$repo [dry-run]")
    return 0
  fi

  "${cmd[@]}" 2>&1 | tee "$log_file"
  local rc=${PIPESTATUS[0]}

  if (( rc == 0 )); then
    SUCCESS_REPOS+=("$repo")
  else
    FAILED_REPOS+=("$repo (exit $rc; log: $log_file)")
    echo "WARN: repository failed; continuing: $repo" >&2
  fi
  return 0
}

install_stream() {
  local count=0
  local repo
  while IFS= read -r repo; do
    [[ -z "$repo" ]] && continue
    count=$((count + 1))

    if [[ "$MAX_REPOS" =~ ^[0-9]+$ ]] && (( MAX_REPOS > 0 && count > MAX_REPOS )); then
      SKIPPED_REPOS+=("$repo [MAX_REPOS=$MAX_REPOS]")
      continue
    fi

    install_repo_all "$repo"
  done
}

write_inventory() {
  local inventory="$LOG_DIR/installed-skill-directories.txt"
  local skill_md_inventory="$LOG_DIR/installed-skill-files.txt"

  if [[ "$GLOBAL_MODE" == "1" ]]; then
    find "$HOME" -path "*/skills/*/SKILL.md" -type f 2>/dev/null \
      | sort -u >"$skill_md_inventory" || true
  else
    find .agents/skills -mindepth 2 -maxdepth 2 -name SKILL.md -type f 2>/dev/null \
      | sort -u >"$skill_md_inventory" || true
    find .agents/skills -mindepth 1 -maxdepth 1 -type d -printf '%f\n' 2>/dev/null \
      | sort -u >"$inventory" || true
  fi
}

verify_installation() {
  echo "skills CLI version:"
  skills_cli --version || true
  echo
  echo "Installed skills for agent: $AGENT"
  skills_cli list -a "$AGENT" || true
  echo
  if [[ -d .agents/skills ]]; then
    local dirs skill_files
    dirs="$(find .agents/skills -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')"
    skill_files="$(find .agents/skills -mindepth 2 -maxdepth 2 -name SKILL.md -type f | wc -l | tr -d ' ')"
    echo "Skill directories: $dirs"
    echo "SKILL.md files:   $skill_files"
    echo
    echo "Production-domain matches:"
    find .agents/skills -mindepth 1 -maxdepth 1 -type d -printf '%f\n' \
      | grep -Ei \
        'solidity|foundry|evm|base|web3|wallet|go|golang|api|openapi|postgres|database|redis|cache|queue|kafka|temporal|workflow|websocket|realtime|next|react|typescript|accessibility|a11y|performance|playwright|vitest|storybook|docker|kubernetes|terraform|pulumi|security|supply|sbom|sentry|observability|otel|prometheus|incident|backup|android|kotlin|analytics|feature-flag|release|documentation' \
      | sort || true
  fi
}

print_profiles() {
  cat <<'EOF'
official-core
agent-workflow
contracts
backend
frontend
quality-security
infra-sre
observability
mobile
docs-release
product
community-extra
production-all
everything-all
EOF
}

print_summary() {
  write_inventory

  echo
  echo "################################################################"
  echo "INSTALL SUMMARY"
  echo "################################################################"
  echo "Profile:          $PROFILE"
  echo "Agent:            $AGENT"
  echo "CLI version:      $SKILLS_CLI_VERSION"
  echo "Scope:            $([[ "$GLOBAL_MODE" == "1" ]] && echo global || echo project)"
  echo "Mode:             $([[ "$COPY_MODE" == "1" ]] && echo copy || echo symlink)"
  echo "Preflight list:   $PREFLIGHT_LIST"
  echo "Successful repos: ${#SUCCESS_REPOS[@]}"
  echo "Failed repos:     ${#FAILED_REPOS[@]}"
  echo "Skipped repos:    ${#SKIPPED_REPOS[@]}"
  echo "Logs/inventory:   $LOG_DIR"

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

  echo
  verify_installation

  if [[ "$STRICT" == "1" ]] && ((${#FAILED_REPOS[@]} > 0)); then
    return 1
  fi
}

# -----------------------------------------------------------------------------
# Entrypoint
# -----------------------------------------------------------------------------

require_tools

case "$PROFILE" in
  list-profiles)
    print_profiles
    ;;
  list-repos)
    TARGET_PROFILE="${2:-production-all}"
    if ! profile_repos "$TARGET_PROFILE" | unique_repos; then
      echo "Unknown profile: $TARGET_PROFILE" >&2
      exit 2
    fi
    ;;
  verify)
    verify_installation
    ;;
  official-core|agent-workflow|contracts|backend|frontend|quality-security|infra-sre|observability|mobile|docs-release|product|community-extra|production-all|everything-all)
    manifest="$LOG_DIR/${PROFILE}-repositories.txt"
    profile_repos "$PROFILE" | unique_repos | tee "$manifest" | install_stream
    print_summary
    ;;
  *)
    echo "Unknown profile: $PROFILE" >&2
    echo "Run: $0 list-profiles" >&2
    exit 2
    ;;
esac
