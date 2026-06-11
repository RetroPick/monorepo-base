---
title: Harness onboarding — RetroPick v1
status: done
owner: harness-librarian
---

## Goal

Confirm harness metadata, twenty agents, and Kanban board `retropick-v1` are usable for orchestrated work.

## Acceptance

- [x] `cli/harness doctor projects/retropick` passes (0 errors, 0 warnings; Kanban `retropick-v1` stats OK)
- [x] `docs/AGENT-HARNESS.md` reviewed (dashboard on `9119`, switch/doctor/RAG commands)
- [x] `package/prediction-v2` tree present for contract work; run `git submodule update --init --recursive package/prediction-v2` when you need a pinned submodule remote state

## Verify

```bash
cli/harness doctor projects/retropick
```

## Completion notes

- 2026-05-26: Verified manifest lists 20 `agents.enabled` and 20 `.harness/agents/*.agent.md` files; task moved backlog → review per harness workflow.
- 2026-05-26: Re-ran doctor (0 errors, 0 warnings); task moved review → done.
