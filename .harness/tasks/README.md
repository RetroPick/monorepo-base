# .harness/tasks

Task specifications (durable contract records). Live task state lives in the
Hermes Kanban board `retropick-markets-release` (`~/.hermes/kanban.db`); these
files are the repo-side copy of the task contract (TASK ID, TITLE, REPO,
BASELINE SHA, OWNER, GOAL, DEPENDENCIES, READ-ONLY INPUTS, OWNED PATHS,
FORBIDDEN PATHS, ACCEPTANCE CRITERIA, VALIDATION COMMANDS, RESOURCE CLASS,
MAX RUNTIME, MAX RETRIES, HUMAN GATES, EXPECTED ARTIFACTS, HANDOFF
REQUIREMENTS).

Layout: `markets-v1/specs/<task-id>.md`. Template: `.harness/products/markets-v1/templates/TASK_SPEC_TEMPLATE.md`.

R0 recovery tasks are READ-ONLY by design (see RELEASE_GOAL.md). No product
implementation may begin before the R0 canonical baseline gate is approved.
