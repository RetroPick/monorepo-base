#!/usr/bin/env bash
set -euo pipefail

# RetroPick skills.sh installer — v2 (production backend expanded)
#
# Recommended:
#   ./retropick-skills-install-v2.sh backend
#
# Focused backend profiles:
#   backend-core          Go, architecture, API, projections, error handling
#   backend-database      PostgreSQL, pgx/sqlc-oriented patterns, migrations, DR
#   backend-cache         Redis cache/connections/security/observability
#   backend-jobs          Event-driven and workflow design (technology-neutral)
#   backend-temporal      Official Temporal durable-workflow skill
#   backend-kafka         Kafka/event-streaming specialist (only when justified)
#   backend-realtime      WebSocket scale, replay, pub/sub, connection operations
#   backend-security      Auth, API security, threat model, supply-chain checks
#   backend-observability OpenTelemetry, SLO/SLI and production diagnostics
#   backend-sentry        Official Sentry Go/OTel setup
#   backend-testing       Go, API contract, DB/integration, load/performance tests
#   backend-sre           reliability, backups, rollout, canary and incident gates
#   backend-scale         microservices, gRPC, gateway, Redis Cluster
#   backend-full          everything above, including optional scale technologies
#
# Existing project profiles are retained:
#   core contracts security frontend production pulumi terraform base-node mobile growth all
#
# Defaults to project-local Cursor installation.
# Overrides:
#   AGENT=codex ./retropick-skills-install-v2.sh backend
#   COPY_MODE=0 ./retropick-skills-install-v2.sh backend
#   DISABLE_TELEMETRY=0 ./retropick-skills-install-v2.sh backend

PROFILE="${1:-backend}"
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

# -----------------------------------------------------------------------------
# BACKEND: CURRENT RETROPICK PRODUCTION BASELINE
# -----------------------------------------------------------------------------

install_backend_core() {
  # Idiomatic Go and production HTTP/service development.
  add_skills googlecloudplatform/devrel-demos \
    go-backend-dev

  add_skills jeffallan/claude-skills \
    golang-pro

  add_skills cxuu/golang-skills \
    go-context

  add_skills bobmatnyc/claude-mpm-skills \
    golang-concurrency-patterns

  # Backend boundaries: API -> application -> domain -> adapters.
  add_skills affaan-m/everything-claude-code \
    backend-patterns \
    hexagonal-architecture \
    coding-standards \
    error-handling

  add_skills vasilyu1983/ai-agents-public \
    software-backend

  # API design, auth-compatible contracts, errors and documentation.
  add_skills wshobson/agents \
    api-design-principles \
    error-handling-patterns \
    projection-patterns \
    cqrs-implementation

  add_skills erichowens/some_claude_skills \
    api-architect

  add_skills supercent-io/skills-template \
    api-documentation
}

install_backend_database() {
  # Go/Postgres access patterns and query lifecycle.
  add_skills bobmatnyc/claude-mpm-skills \
    golang-database-patterns

  # Supabase's skill is PostgreSQL-general: schema, indexes, EXPLAIN, locking,
  # pooling, security and operational performance. It does not require using
  # Supabase as RetroPick's database provider.
  add_skills supabase/agent-skills \
    supabase-postgres-best-practices

  add_skills mindrally/skills \
    postgresql-best-practices

  add_skills affaan-m/everything-claude-code \
    postgres-patterns \
    database-migrations

  # Zero-downtime migration planning, validation and rollback discipline.
  add_skills sickn33/antigravity-awesome-skills \
    database-migrations-sql-migrations

  # Backup/restore, retention, RPO/RTO and restore verification.
  add_skills aj-geddes/useful-ai-prompts \
    database-backup-restore
}

install_backend_cache() {
  # Official Redis skills. Redis must remain non-canonical in RetroPick:
  # cache/rate limits/session acceleration/presence only; never settlement,
  # balances, claims, chain events or keeper source of truth.
  add_skills redis/agent-skills \
    redis-development \
    redis-core \
    redis-connections \
    redis-security \
    redis-observability
}

install_backend_jobs_patterns() {
  # Technology-neutral event design: queue vs pub/sub, consumer groups,
  # idempotency, retries, DLQ, ordering, sagas and event contracts.
  add_skills cosmix/loom \
    event-driven

  # Durable-workflow decision framework. Installing this does not require
  # adopting Temporal immediately.
  add_skills wshobson/agents \
    workflow-orchestration-patterns
}

install_backend_temporal_optional() {
  # Official multi-language Temporal skill, including Go workers/workflows.
  # Use for long-lived, multi-step funding/bridge/reporting flows that must
  # survive process failure and resume from durable event history.
  add_skills temporalio/skill-temporal-developer \
    temporal-developer
}

install_backend_kafka_optional() {
  # Kafka is not part of the current RetroPick baseline. Install only when
  # several independent consumers, replayable high-volume streams, CDC or
  # consumer-lag operations justify the infrastructure cost.
  add_skills 404kidwiz/claude-supercode-skills \
    kafka-engineer
}

install_backend_realtime() {
  add_skills jeffallan/claude-skills \
    websocket-engineer

  add_skills agents-inc/skills \
    web-realtime-websockets
}

install_backend_security() {
  # SIWE/session/JWT/RBAC patterns and endpoint-level authorization.
  add_skills wshobson/agents \
    auth-implementation-patterns

  add_skills sickn33/antigravity-awesome-skills \
    api-security-best-practices

  add_skills openai/skills \
    security-threat-model \
    security-best-practices

  add_skills github/copilot-plugins \
    secret-scanning \
    dependency-scanning
}

install_backend_observability() {
  # Vendor-neutral instrumentation and context propagation.
  add_skills bobmatnyc/claude-mpm-skills \
    golang-observability-opentelemetry

  # Logs + metrics + traces + profiles as QA signals; SLI/SLO and burn-rate
  # alert design.
  add_skills vasilyu1983/ai-agents-public \
    qa-observability
}

install_backend_sentry_optional() {
  add_skills getsentry/sentry-agent-skills \
    sentry-go-sdk \
    sentry-setup-logging \
    sentry-setup-tracing \
    sentry-setup-metrics \
    sentry-otel-exporter-setup \
    sentry-create-alert \
    sentry-fix-issues
}

install_backend_testing() {
  add_skills cxuu/golang-skills \
    go-code-review \
    go-testing

  add_skills obra/superpowers \
    test-driven-development \
    systematic-debugging \
    verification-before-completion

  # Property/invariant tests are useful for indexer idempotency, reorg rewind,
  # ledger conservation, retry behavior and state-machine transitions.
  add_skills trailofbits/skills \
    property-based-testing

  add_skills secondsky/claude-skills \
    api-contract-testing

  add_skills patricio0312rev/skills \
    api-test-suite-generator \
    contract-testing-builder \
    load-test-builder

  add_skills alirezarezvani/claude-skills \
    performance-profiler
}

install_backend_sre() {
  # Timeouts, retry budgets, circuit breakers, bulkheads, graceful degradation,
  # SLO/error budgets, DR and runbooks.
  add_skills patricio0312rev/skills \
    reliability-strategy-builder

  add_skills affaan-m/everything-claude-code \
    docker-patterns \
    deployment-patterns \
    production-audit \
    canary-watch

  add_skills openai/skills \
    gh-fix-ci
}

install_backend_scale_optional() {
  # Do not use these to force a premature microservice split. They are for a
  # later stage when services have independent ownership/deployment/scaling.
  add_skills wshobson/agents \
    microservices-patterns

  add_skills jeremylongshore/claude-code-plugins-plus-skills \
    generating-grpc-services

  add_skills nickcrew/claude-ctx-plugin \
    api-gateway-patterns

  add_skills redis/agent-skills \
    redis-clustering
}

install_backend_community_jobs_optional() {
  # Useful generic background-job review, but community maintained and its
  # skills.sh audit currently includes a warning. Review SKILL.md before use.
  add_skills erichowens/some_claude_skills \
    background-job-orchestrator

  # Relevant to RetroPick funding/provider callbacks: signature verification,
  # durable dedupe, idempotent processing, retries and incident runbooks.
  # Community maintained; current skills.sh audits include a warning.
  add_skills patricio0312rev/skills \
    webhook-receiver-hardener
}

install_backend_recommended() {
  install_backend_core
  install_backend_database
  install_backend_cache
  install_backend_jobs_patterns
  install_backend_realtime
  install_backend_security
  install_backend_observability
  install_backend_testing
  install_backend_sre
}

install_backend_full() {
  install_backend_recommended
  install_backend_sentry_optional
  install_backend_temporal_optional
  install_backend_kafka_optional
  install_backend_scale_optional
  install_backend_community_jobs_optional
}

# -----------------------------------------------------------------------------
# CONTRACTS / FRONTEND / PRODUCTION / OTHER EXISTING PROFILES
# -----------------------------------------------------------------------------

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
  add_skills affaan-m/everything-claude-code \
    prediction-market-risk-review \
    prediction-market-oracle-research \
    defi-amm-security \
    evm-token-decimals \
    nodejs-keccak256
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
  install_backend_sre
  install_backend_observability
  install_backend_sentry_optional

  add_skills openai/skills \
    gh-address-comments \
    security-ownership-map

  add_skills affaan-m/everything-claude-code \
    security-scan

  add_skills getsentry/sentry-agent-skills \
    sentry-nextjs-sdk \
    sentry-react-sdk \
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

install_recommended() {
  install_workflow
  install_contracts_core
  install_backend_recommended
  install_frontend
}

case "$PROFILE" in
  workflow)
    install_workflow
    ;;
  backend-core)
    install_backend_core
    ;;
  backend-database|backend-db)
    install_backend_database
    ;;
  backend-cache|redis)
    install_backend_cache
    ;;
  backend-jobs|backend-queue)
    install_backend_jobs_patterns
    ;;
  backend-temporal|temporal)
    install_backend_temporal_optional
    ;;
  backend-kafka|kafka)
    install_backend_kafka_optional
    ;;
  backend-realtime)
    install_backend_realtime
    ;;
  backend-security)
    install_backend_security
    ;;
  backend-observability)
    install_backend_observability
    ;;
  backend-sentry)
    install_backend_sentry_optional
    ;;
  backend-testing)
    install_backend_testing
    ;;
  backend-sre)
    install_backend_sre
    ;;
  backend-scale)
    install_backend_scale_optional
    ;;
  backend)
    install_backend_recommended
    ;;
  backend-full)
    install_backend_full
    ;;
  contracts)
    install_contracts_core
    install_prediction_market_domain
    ;;
  security)
    install_contracts_core
    install_contracts_deep_security
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
    install_backend_full
    install_frontend
    install_production
    install_pulumi_optional
    install_base_node_optional
    install_mobile
    install_growth
    ;;
  *)
    echo "Unknown profile: $PROFILE" >&2
    echo "Valid profiles:" >&2
    echo "  workflow backend backend-full backend-core backend-database backend-cache" >&2
    echo "  backend-jobs backend-temporal backend-kafka backend-realtime" >&2
    echo "  backend-security backend-observability backend-sentry backend-testing" >&2
    echo "  backend-sre backend-scale contracts security frontend production" >&2
    echo "  pulumi terraform base-node mobile growth core all" >&2
    exit 2
    ;;
esac

echo
echo "Installed profile '$PROFILE' for agent '$AGENT'."
echo "Review with:       npx skills list"
echo "Check updates with: npx skills check"
