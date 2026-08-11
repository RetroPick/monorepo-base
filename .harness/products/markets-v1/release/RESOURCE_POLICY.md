# RESOURCE_POLICY — VPS concurrency classes

Small engineering VPS. Conservative fleet.

## Global concurrency

- `max_in_progress = 2` (board-level)
- `max_in_progress_per_profile = 1`

## Resource classes

| Class | Examples | Concurrency |
|---|---|---|
| light | planning, research/recovery, small targeted test, reviewer, docs | several may run |
| medium | single-service build, unit test suite, DB migration prep | limited |
| heavy | full pnpm build, browser E2E, Android/Gradle build, Docker full stack, broad Go integration suite | **only ONE at a time** |

## Rules

- Only one HEAVY worker at a time.
- A second concurrent worker should normally be: reviewer, research/recovery, small targeted test, or planning.
- **Never run simultaneously:** Gradle + full Docker + browser E2E + full pnpm build.
- Heavy operations map to `max-runtime` and `resource_class` in the task contract; the orchestrator enforces scheduling.

## Environment

- Disk: ~29G free (monorepo ~9.7G used). Gradle/Android builds + Docker images must budget disk.
- No production deployment without human release gate.
