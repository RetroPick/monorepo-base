#!/usr/bin/env python3
"""Static, dependency-free contracts for the Markets staging stack."""

from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "docker-compose.markets-staging.yml"
NGINX = ROOT / "docker/nginx-production.conf.template"
DOCKERFILE = ROOT / "apps/backend/Dockerfile"
WEB_DOCKERFILE = ROOT / "apps/web/Dockerfile"
DEV_MANIFEST = ROOT / "docker-compose.markets-dev.yml"
LOCAL_CADDY = ROOT / "docker/Caddyfile.markets-staging-local"
LOCAL_RUNBOOK = ROOT / ".harness/products/markets-v1/release/MARKETS_LOCAL_STAGING_RUNBOOK.md"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def indented_block(text: str, header: str, indent: int) -> str:
    marker = " " * indent + header
    start = text.find(marker)
    require(start >= 0, f"missing block: {header}")
    lines = text[start:].splitlines()
    body = [lines[0]]
    for line in lines[1:]:
        if line and len(line) - len(line.lstrip()) <= indent:
            break
        body.append(line)
    return "\n".join(body)


def check_manifest() -> None:
    require(MANIFEST.is_file(), "missing canonical docker-compose.markets-staging.yml")
    text = MANIFEST.read_text()
    for service in ("postgres:", "markets-migrate:", "markets-api:", "nginx:"):
        require(re.search(rf"^  {re.escape(service)}$", text, re.M) is not None, f"missing service {service}")

    migrate = indented_block(text, "markets-migrate:", 2)
    api = indented_block(text, "markets-api:", 2)
    postgres = indented_block(text, "postgres:", 2)
    nginx = indented_block(text, "nginx:", 2)

    require("dockerfile: apps/backend/Dockerfile" in text, "staging image must use apps/backend/Dockerfile")
    for block, name in ((migrate, "migrator"), (api, "API")):
        require("<<: *markets-image" in block, f"{name} must use the canonical Markets image")
    require('command: ["/migrator"]' in migrate, "migrator must run /migrator")
    require('entrypoint: [""]' in migrate, "migrator must override the /markets-api image entrypoint")
    require("condition: service_completed_successfully" in api, "API must wait for successful migration")
    require('test: ["CMD", "/healthcheck", "/api/v1/health/ready"]' in api, "API healthcheck must use readiness")
    require("MARKETS_BOOTSTRAP" not in text and "MARKETS_DEV_SEED" not in text, "staging must never seed")
    require("127.0.0.1:9" not in text, "staging must not use fake upstreams")

    required = (
        "DATABASE_URL", "MARKETS_AUTH_SESSION_SECRET", "MARKETS_AUTH_ALLOWED_DOMAINS",
        "MARKETS_CORS_ALLOWED_ORIGINS", "MARKETS_REALTIME_ALLOWED_ORIGINS",
        "MARKETS_GEOIP_BASE_URL", "MARKETS_GEOIP_PATH", "MARKETS_GEOIP_API_KEY",
        "MARKETS_GEOBLOCK_BASE_URL", "MARKETS_GEOBLOCK_PATH", "TRUSTED_PROXY_CIDRS",
    )
    for name in required:
        require(f"${{{name}:?" in text, f"{name} must use fail-fast interpolation")
    require('MARKETS_AUTH_COOKIE_SECURE: "1"' in api, "secure auth cookies must be fixed on")
    require('MARKETS_AUTH_COOKIE_SAMESITE: "${MARKETS_AUTH_COOKIE_SAMESITE:?' in api, "SameSite must be explicit")
    require('MARKETS_ORDER_SUBMIT_ENABLED: "false"' in api, "order submission must remain disabled")
    require('MARKETS_PORTFOLIO_READ_ENABLED: "false"' in api, "portfolio_read must be encoded false")
    require("ports:" not in postgres, "PostgreSQL must not be publicly published")
    require("ports:" not in api, "API/metrics must not be publicly published")
    require("markets_staging_postgres_data:/var/lib/postgresql/data" in postgres, "PostgreSQL must be persistent")
    require('"80:80"' in nginx and '"443:443"' in nginx, "only TLS proxy should publish public ports")

    for line in text.splitlines():
        if re.match(r"(?i)^\s*(?:POSTGRES_PASSWORD|.*SECRET|.*API_KEY):", line):
            require("${" in line, f"secret-bearing field must be interpolated: {line.strip()}")


def check_proxy() -> None:
    text = NGINX.read_text()
    route = indented_block(text, "location = /api/v1/markets/realtime {", 2)
    for fragment in (
        "proxy_pass http://${API_UPSTREAM};", "proxy_http_version 1.1;",
        "proxy_set_header Upgrade $http_upgrade;", 'proxy_set_header Connection "upgrade";',
        "proxy_set_header Host $host;", "proxy_set_header X-Real-IP $remote_addr;",
        "proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;",
        "proxy_set_header X-Forwarded-Proto $scheme;",
    ):
        require(fragment in route, f"realtime proxy missing {fragment}")


def check_local_staging() -> None:
    dev_text = DEV_MANIFEST.read_text()
    caddy_text = LOCAL_CADDY.read_text()
    for fragment, message in (
        ('MARKETS_REALTIME_ENABLED: "0"', "local realtime must be explicitly disabled"),
        ('MARKETS_ORDER_SUBMIT_ENABLED: "false"', "local order submission must be explicitly disabled"),
        ('MARKETS_PORTFOLIO_READ_ENABLED: "false"', "local portfolio reads must be explicitly disabled"),
        ('MARKETS_AUTH_COOKIE_SECURE: "1"', "local TLS rehearsal must use secure auth cookies"),
        ('MARKETS_AUTH_COOKIE_SAMESITE: "Lax"', "local TLS rehearsal must fix SameSite explicitly"),
    ):
        require(fragment in dev_text, message)
    require("@metrics path /metrics" in caddy_text and "respond @metrics 404" in caddy_text,
            "local TLS proxy must not expose the metrics endpoint")
    for header in ("X-Content-Type-Options nosniff", "Referrer-Policy no-referrer", "X-Frame-Options DENY"):
        require(header in caddy_text, f"local TLS proxy missing security header: {header}")
    runbook_text = LOCAL_RUNBOOK.read_text()
    require('export RETROPICK_VCS_REF="$(git rev-parse HEAD)"' in runbook_text,
            "local runbook must bind builds to the checked-out exact revision")
    require("--preserve-env=RETROPICK_VCS_REF," in runbook_text,
            "local runbook must pass the exact revision through sudo")
    require("org.opencontainers.image.revision" in runbook_text,
            "local runbook must verify runtime image provenance")


def check_image() -> None:
    text = DOCKERFILE.read_text()
    web_text = WEB_DOCKERFILE.read_text()
    staging_text = MANIFEST.read_text()
    dev_text = DEV_MANIFEST.read_text()
    require("-o /out/migrator ./cmd/migrator" in text, "backend image must include /migrator")
    require('ENTRYPOINT ["/markets-api"]' in text, "backend image must still default to /markets-api")
    for image_text, name in ((text, "backend"), (web_text, "web")):
        require("ARG RETROPICK_VCS_REF" in image_text, f"{name} image must accept exact source revision")
        require(
            'org.opencontainers.image.revision="${RETROPICK_VCS_REF}"' in image_text,
            f"{name} image must label its exact source revision",
        )
    require(
        "RETROPICK_VCS_REF: \"${RETROPICK_VCS_REF:?exact canonical git SHA is required}\"" in staging_text,
        "staging image build must fail fast without an exact source revision",
    )
    require(dev_text.count("RETROPICK_VCS_REF: \"${RETROPICK_VCS_REF:?exact canonical git SHA is required}\"") == 2,
            "local backend and web builds must both fail fast without an exact source revision")


def main() -> int:
    try:
        check_manifest()
        check_proxy()
        check_local_staging()
        check_image()
    except AssertionError as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        return 1
    print("Markets staging compose/image/proxy contracts: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
