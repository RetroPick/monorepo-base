#!/usr/bin/env python3
"""Dependency-free static contracts for the local Markets rehearsal topology."""

from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "docker-compose.markets-rehearsal.yml"
CADDY = ROOT / "docker/Caddyfile.markets-rehearsal"
RUNBOOK = ROOT / ".harness/products/markets-v1/release/MARKETS_LOCAL_STAGING_RUNBOOK.md"
DEV_MANIFEST = ROOT / "docker-compose.markets-dev.yml"
BACKEND_DOCKERFILE = ROOT / "apps/backend/Dockerfile"
WEB_DOCKERFILE = ROOT / "apps/web/Dockerfile"


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
    require(MANIFEST.is_file(), "missing standalone docker-compose.markets-rehearsal.yml")
    text = MANIFEST.read_text()
    require("name: retropick-markets-rehearsal" in text, "rehearsal must have an isolated project name")
    for service in ("postgres:", "markets-migrate:", "markets-api:", "markets-web:", "caddy:"):
        require(re.search(rf"^  {re.escape(service)}$", text, re.M) is not None, f"missing service {service}")

    postgres = indented_block(text, "postgres:", 2)
    migrate = indented_block(text, "markets-migrate:", 2)
    api = indented_block(text, "markets-api:", 2)
    web = indented_block(text, "markets-web:", 2)
    caddy = indented_block(text, "caddy:", 2)

    require("<<: *markets-backend-image" in migrate, "migrator must use the backend image identity")
    require("<<: *markets-backend-image" in api, "API must use the backend image identity")
    require("entrypoint: []" in migrate,
            "migrator must clear the API entrypoint with an empty Compose list")
    require('entrypoint: [""]' not in migrate,
            "migrator entrypoint must not name an empty executable")
    require('command: ["/migrator"]' in migrate, "migrator must run /migrator")
    require("condition: service_healthy" in migrate, "migrator must wait for PostgreSQL health")
    require("condition: service_completed_successfully" in api, "API must wait for successful migration")
    require("condition: service_healthy" in web, "Web must wait for API health")
    require(caddy.count("condition: service_healthy") == 2, "Caddy must wait for healthy API and Web")

    require("MARKETS_BOOTSTRAP" not in text, "rehearsal must not configure API bootstrap")
    require("MARKETS_DEV_SEED" not in text, "rehearsal must not configure development seeding")
    require('MARKETS_REALTIME_ENABLED: "1"' in api, "realtime must be enabled for WebSocket proof")
    require('MARKETS_ORDER_SUBMIT_ENABLED: "false"' in api, "order submission must remain disabled")
    require('MARKETS_PORTFOLIO_READ_ENABLED: "false"' in api, "portfolio reads must remain disabled")
    require('MARKETS_AUTH_COOKIE_SECURE: "1"' in api, "auth cookie must be Secure")
    require('MARKETS_AUTH_COOKIE_SAMESITE: "Lax"' in api, "auth cookie must use SameSite=Lax")

    for name in (
        "RETROPICK_VCS_REF",
        "MARKETS_AUTH_SESSION_SECRET",
        "MARKETS_AUTH_ALLOWED_DOMAINS",
        "MARKETS_CORS_ALLOWED_ORIGINS",
        "MARKETS_REALTIME_ALLOWED_ORIGINS",
        "REHEARSAL_POSTGRES_PASSWORD",
    ):
        require(f"${{{name}:?" in text, f"{name} must fail fast when missing or empty")
    require(text.count("RETROPICK_VCS_REF: \"${RETROPICK_VCS_REF:?") == 2,
            "backend and Web builds must both require an exact revision")
    require('MARKETS_AUTH_SESSION_SECRET: "${MARKETS_AUTH_SESSION_SECRET:?' in api,
            "session secret must come only from operator environment")

    for block, port, name in (
        (postgres, '"127.0.0.1:5434:5432"', "PostgreSQL"),
        (api, '"127.0.0.1:8081:8080"', "API"),
        (web, '"127.0.0.1:3002:3001"', "Web"),
        (caddy, '"127.0.0.1:8443:443"', "Caddy TLS"),
    ):
        require(port in block, f"{name} must have the exact loopback-only diagnostic publication")
    require("0.0.0.0:" not in text, "rehearsal must not publish wildcard host ports")
    require("markets_rehearsal_postgres_data:/var/lib/postgresql/data" in postgres,
            "rehearsal PostgreSQL must use its unique volume")
    require("markets_rehearsal_caddy_data:/data" in caddy and "markets_rehearsal_caddy_config:/config" in caddy,
            "rehearsal Caddy must use unique data/config volumes")
    require("markets_dev_" not in text and "markets_staging_" not in text,
            "rehearsal must not inherit development or staging volumes")
    require("extends:" not in text, "rehearsal must not use Compose inheritance")

    require('test: ["CMD", "/healthcheck", "/api/v1/health/ready"]' in api,
            "API dependency health must use readiness")
    require("docker/Caddyfile.markets-rehearsal" in caddy, "Caddy must mount the rehearsal routing config")
    for line in text.splitlines():
        if re.match(r"(?i)^\s*(?:POSTGRES_PASSWORD|.*SECRET|.*API_KEY):", line):
            require("${" in line, f"secret-bearing field must be interpolated: {line.strip()}")


def brace_block(text: str, header: str) -> str:
    start = text.find(header)
    require(start >= 0, f"missing block: {header}")
    depth = 0
    opened = False
    for index in range(start, len(text)):
        if text[index] == "{":
            depth += 1
            opened = True
        elif text[index] == "}":
            depth -= 1
            if opened and depth == 0:
                return text[start:index + 1]
    raise AssertionError(f"unterminated block: {header}")


def check_caddy() -> None:
    require(CADDY.is_file(), "missing rehearsal Caddyfile")
    text = CADDY.read_text()
    require("https://localhost" in text and "tls internal" in text, "Caddy must serve localhost with internal TLS")
    for header in ("X-Content-Type-Options nosniff", "Referrer-Policy no-referrer", "X-Frame-Options DENY"):
        require(header in text, f"Caddy missing security header: {header}")
    metrics = text.find("respond /metrics 404")
    api = text.find("handle /api/*")
    web = text.find("handle {")
    require(-1 not in (metrics, api, web) and metrics < api < web,
            "Caddy routes must deny metrics, then route API, then fall back to Web")
    api_block = brace_block(text, "handle /api/* {")
    web_block = brace_block(text, "handle {")
    require("reverse_proxy markets-api:8080" in api_block, "API/health/realtime must route to markets-api:8080")
    require("reverse_proxy markets-web:3001" in web_block, "other Web paths must route to markets-web:3001")
    require("Connection" not in api_block and "Upgrade" not in api_block,
            "Caddy reverse_proxy must retain native WebSocket upgrade handling")


def check_images_and_dev_unchanged() -> None:
    backend = BACKEND_DOCKERFILE.read_text()
    web = WEB_DOCKERFILE.read_text()
    require("-o /out/migrator ./cmd/migrator" in backend, "backend image must contain /migrator")
    for text, name in ((backend, "backend"), (web, "Web")):
        require("ARG RETROPICK_VCS_REF" in text, f"{name} image must accept the exact revision")
        require('org.opencontainers.image.revision="${RETROPICK_VCS_REF}"' in text,
                f"{name} image must carry the OCI revision label")
    dev = DEV_MANIFEST.read_text()
    require('MARKETS_BOOTSTRAP: "migrate-and-seed"' in dev, "ordinary developer bootstrap must remain seeded")
    require('MARKETS_DEV_SEED_SCENARIO: "populated"' in dev, "ordinary developer seed scenario must remain unchanged")
    require('MARKETS_DEV_SEED_REFRESH_INTERVAL: "1m"' in dev, "ordinary developer refresh must remain unchanged")


def check_runbook() -> None:
    text = RUNBOOK.read_text()
    for fragment, message in (
        ("docker-compose.markets-rehearsal.yml", "runbook must invoke only the standalone rehearsal manifest"),
        ('export RETROPICK_VCS_REF="$(git rev-parse HEAD)"', "runbook must bind the exact revision"),
        ("MARKETS_AUTH_SESSION_SECRET", "runbook must require an operator session secret"),
        ("MARKETS_AUTH_ALLOWED_DOMAINS=localhost", "runbook must use the exact SIWE localhost domain"),
        ("MARKETS_CORS_ALLOWED_ORIGINS=https://localhost:8443", "runbook must use the exact CORS origin"),
        ("MARKETS_REALTIME_ALLOWED_ORIGINS=https://localhost:8443", "runbook must use the exact realtime origin"),
        ("org.opencontainers.image.revision", "runbook must verify OCI revision labels"),
        ("/api/v1/markets/realtime", "runbook must retain residual WebSocket proof"),
        ("order_submit == false", "runbook must verify order-submit capability false"),
        ("portfolio_read == false", "runbook must verify portfolio-read capability false"),
        ("Do not run", "runbook must state static-only lease restrictions"),
    ):
        require(fragment in text, message)
    require("docker-compose.markets-dev.yml -f" not in text,
            "runbook must not silently layer rehearsal over development")


def main() -> int:
    try:
        check_manifest()
        check_caddy()
        check_images_and_dev_unchanged()
        check_runbook()
    except (AssertionError, FileNotFoundError) as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        return 1
    print("Markets local rehearsal compose/image/proxy/runbook contracts: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
