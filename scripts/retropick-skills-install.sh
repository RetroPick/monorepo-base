#!/usr/bin/env bash
set -euo pipefail

# RetroPick skills.sh installer
# Usage:
#   ./retropick-skills-install.sh core
#   ./retropick-skills-install.sh contracts
#   ./retropick-skills-install.sh backend
#   ./retropick-skills-install.sh frontend
#   ./retropick-skills-install.sh production
#   ./retropick-skills-install.sh pulumi
#   ./retropick-skills-install.sh terraform
#   ./retropick-skills-install.sh mobile
#   ./retropick-skills-install.sh growth
#   ./retropick-skills-install.sh all
#
# Defaults to a project-local Cursor installation. Override with:
#   AGENT=codex ./retropick-skills-install.sh core
#   COPY_MODE=0 ./retropick-skills-install.sh core

PROFILE="${1:-core}"
AGENT="${AGENT:-cursor}"
COPY_MODE="${COPY_MODE:-1}"
export DISABLE_TELEMETRY="${DISABLE_TELEMETRY:-1}"

add_skills() {
  local repo="$1"
  shift
  local args=("add" "$repo" "-a" "$AGENT" "-y")
  if [[ "$COPY_MODE" == "1" ]]; then
    args+=("--copy")
  fi
  local skill
  for skill in "$@"; do
    args+=("--skill" "$skill")
  done
  echo
  echo "==> Installing from $repo: $*"
  npx --yes skills "${args[@]}"
}


install_recommended() {
  # Balanced day-to-day set. Prefer this over "all".
  add_skills vercel-labs/skills \
    find-skills

  add_skills obra/superpowers \
    systematic-debugging \
    writing-plans \
    verification-before-completion \
    requesting-code-review

  add_skills base/skills \
    connecting-to-base-network \
    deploying-contracts-on-base \
    build-on-base

  add_skills trailofbits/skills \
    secure-workflow-guide \
    entry-point-analyzer \
    guidelines-advisor \
    property-based-testing \
    spec-to-code-compliance \
    token-integration-analyzer

  add_skills openai/skills \
    security-threat-model \
    security-best-practices \
    gh-fix-ci

  add_skills googlecloudplatform/devrel-demos \
    go-backend-dev

  add_skills jeffallan/claude-skills \
    golang-pro

  add_skills cxuu/golang-skills \
    go-testing

  add_skills bobmatnyc/claude-mpm-skills \
    golang-observability-opentelemetry

  add_skills supabase/agent-skills \
    supabase-postgres-best-practices

  add_skills wshobson/agents \
    api-design-principles

  add_skills vercel-labs/agent-skills \
    vercel-react-best-practices \
    vercel-composition-patterns \
    web-design-guidelines \
    deploy-to-vercel

  add_skills vercel-labs/openreview \
    next-best-practices

  add_skills vercel/turborepo \
    turborepo

  add_skills antfu/skills \
    pnpm

  add_skills microsoft/playwright-cli \
    playwright-cli

  add_skills currents-dev/playwright-best-practices-skill \
    playwright-best-practices

  add_skills github/copilot-plugins \
    secret-scanning \
    dependency-scanning

  add_skills affaan-m/everything-claude-code \
    docker-patterns \
    deployment-patterns \
    database-migrations \
    production-audit

  add_skills getsentry/sentry-agent-skills \
    sentry-go-sdk \
    sentry-nextjs-sdk \
    sentry-setup-logging \
    sentry-setup-tracing
}

install_workflow() {
  add_skills vercel-labs/skills \
    find-skills

  add_skills obra/superpowers \
    systematic-debugging \
    writing-plans \
    test-driven-development \
    verification-before-completion \
    requesting-code-review \
    finishing-a-development-branch
}

install_contracts_core() {
  add_skills base/skills \
    connecting-to-base-network \
    deploying-contracts-on-base \
    build-on-base

  add_skills trailofbits/skills \
    secure-workflow-guide \
    audit-context-building \
    entry-point-analyzer \
    guidelines-advisor \
    property-based-testing \
    spec-to-code-compliance \
    coverage-analysis \
    token-integration-analyzer \
    insecure-defaults \
    differential-review

  add_skills openai/skills \
    security-threat-model \
    security-best-practices
}

install_contracts_deep_security() {
  add_skills trailofbits/skills \
    codeql \
    semgrep \
    code-maturity-assessor \
    supply-chain-risk-auditor \
    sharp-edges \
    variant-analysis \
    sarif-parsing \
    audit-prep-assistant \
    testing-handbook-generator \
    fuzzing-obstacles \
    fuzzing-dictionary \
    harness-writing \
    mutation-testing \
    second-opinion \
    fix-review \
    audit-augmentation \
    agentic-actions-auditor

  add_skills schwepps/skills \
    solidity-auditor
}

install_prediction_market_domain() {
  # Community skills: useful because they are unusually specific to RetroPick,
  # but review their SKILL.md and audit page before allowing tool execution.
  add_skills affaan-m/everything-claude-code \
    prediction-market-risk-review \
    prediction-market-oracle-research \
    defi-amm-security \
    evm-token-decimals \
    nodejs-keccak256
}

install_backend() {
  add_skills googlecloudplatform/devrel-demos \
    go-backend-dev

  add_skills jeffallan/claude-skills \
    golang-pro

  add_skills cxuu/golang-skills \
    go-code-review \
    go-testing \
    go-context

  add_skills bobmatnyc/claude-mpm-skills \
    golang-concurrency-patterns \
    golang-database-patterns \
    golang-observability-opentelemetry

  add_skills supabase/agent-skills \
    supabase-postgres-best-practices

  add_skills wshobson/agents \
    api-design-principles

  add_skills vasilyu1983/ai-agents-public \
    software-backend

  add_skills agents-inc/skills \
    web-realtime-websockets
}

install_frontend() {
  add_skills vercel-labs/agent-skills \
    vercel-react-best-practices \
    vercel-composition-patterns \
    web-design-guidelines \
    deploy-to-vercel

  add_skills vercel-labs/openreview \
    next-best-practices \
    next-cache-components

  add_skills vercel/turborepo \
    turborepo

  add_skills antfu/skills \
    pnpm

  add_skills anthropics/skills \
    frontend-design \
    webapp-testing

  add_skills agents-inc/skills \
    web-routing-react-router \
    web-server-state-react-query \
    web-realtime-websockets \
    web-error-handling-error-boundaries \
    web-accessibility-web-accessibility \
    web-performance-web-performance

  add_skills microsoft/playwright-cli \
    playwright-cli

  add_skills currents-dev/playwright-best-practices-skill \
    playwright-best-practices
}

install_production() {
  add_skills openai/skills \
    gh-fix-ci \
    gh-address-comments \
    security-ownership-map

  add_skills github/copilot-plugins \
    secret-scanning \
    dependency-scanning

  add_skills affaan-m/everything-claude-code \
    docker-patterns \
    deployment-patterns \
    database-migrations \
    production-audit \
    canary-watch \
    security-scan \
    error-handling

  add_skills getsentry/sentry-agent-skills \
    sentry-go-sdk \
    sentry-nextjs-sdk \
    sentry-react-sdk \
    sentry-setup-logging \
    sentry-setup-tracing \
    sentry-setup-metrics \
    sentry-otel-exporter-setup \
    sentry-create-alert \
    sentry-fix-issues \
    sentry-pr-code-review
}

install_pulumi_optional() {
  add_skills pulumi/agent-skills \
    pulumi-best-practices \
    pulumi-component \
    pulumi-esc \
    pulumi-automation-api
}

install_terraform_optional() {
  add_skills hashicorp/agent-skills \
    terraform-style-guide \
    terraform-test \
    terraform-policy
}

install_base_node_optional() {
  add_skills base/skills \
    running-a-base-node \
    base-mcp
}

install_mobile() {
  add_skills affaan-m/everything-claude-code \
    android-clean-architecture \
    kotlin-patterns \
    kotlin-coroutines-flows \
    kotlin-testing

}

install_growth() {
  add_skills posthog/posthog-for-claude \
    posthog-instrumentation

  add_skills coreyhaines31/marketingskills \
    analytics-tracking \
    seo-audit \
    content-strategy \
    copywriting \
    copy-editing \
    programmatic-seo \
    marketing-ideas \
    marketing-psychology
}

case "$PROFILE" in
  workflow)
    install_workflow
    ;;
  contracts)
    install_contracts_core
    install_prediction_market_domain
    ;;
  security)
    install_contracts_core
    install_contracts_deep_security
    ;;
  backend)
    install_backend
    ;;
  frontend)
    install_frontend
    ;;
  production)
    install_production
    ;;
  iac|pulumi)
    install_pulumi_optional
    ;;
  terraform)
    install_terraform_optional
    ;;
  base-node)
    install_base_node_optional
    ;;
  mobile)
    install_mobile
    ;;
  growth)
    install_growth
    ;;
  core)
    install_recommended
    ;;
  all)
    install_workflow
    install_contracts_core
    install_contracts_deep_security
    install_prediction_market_domain
    install_backend
    install_frontend
    install_production
    install_pulumi_optional
    install_base_node_optional
    install_mobile
    install_growth
    ;;
  *)
    echo "Unknown profile: $PROFILE" >&2
    echo "Valid profiles: workflow contracts security backend frontend production iac pulumi terraform base-node mobile growth core all" >&2
    exit 2
    ;;
esac

echo
echo "Installed profile '$PROFILE' for agent '$AGENT'."
echo "Review with: npx skills list"
echo "Check updates with: npx skills check"
