# .harness/state

**No runtime state is committed to Git.**

Live execution state lives outside the repository:

```
~/.hermes/kanban.db                              # Hermes Kanban (live task state)
~/.local/state/retropick-harness/
├── release-state.yaml                          # generated release state
├── evidence/
├── logs/
├── snapshots/
└── locks/
```

Generated artifacts that must never be committed here:

- `*.sqlite`, `*.db`
- runtime logs (`*.log`, `*.out`)
- generated snapshots / locks / scratch files

Regeneration: `.harness/scripts/reconcile-release-state.sh` (or `--check` via cron) regenerates release state; RAG databases are regenerated from `rag.config.json` by the RAG indexing tooling.

The previous tracked `rag.sqlite` was removed from Git tracking during the release-factory v2 migration; it is ignored via `.gitignore`.
