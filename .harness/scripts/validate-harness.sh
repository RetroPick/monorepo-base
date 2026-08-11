#!/usr/bin/env bash
# validate-harness.sh — harness integrity gate. Fails non-zero on violations.
# READ-ONLY with respect to product code.
set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FAIL=0
ok()   { echo "  ok: $*"; }
bad()  { echo "  VIOLATION: $*"; FAIL=1; }

echo "== validate-harness ($ROOT) =="

# 1. JSON parses
for f in .harness/project.manifest.json .harness/rag.config.json; do
  python3 -c "import json,sys; json.load(open('$ROOT/$f'))" 2>/dev/null \
    && ok "json parses: $f" || bad "json does not parse: $f"
done

# 2. YAML parses
for f in .harness/products/markets-v1/planning/implementation-manifest.yaml \
         .harness/products/markets-v1/planning/task-graph.yaml \
         .harness/products/markets-v1/release/REPO_MAP.yaml \
         .harness/products/markets-v1/release/ROUTING.yaml \
         .harness/products/markets-v1/release/GATES.yaml \
         .harness/products/markets-v1/release/HUMAN_GATES.yaml \
         .harness/products/markets-v1/release/RELEASE_STATE_SCHEMA.yaml; do
  python3 -c "import yaml,sys; yaml.safe_load(open('$ROOT/$f'))" 2>/dev/null \
    && ok "yaml parses: $f" || bad "yaml does not parse: $f"
done

# 3. active agent files exist
for a in rp-release-orchestrator rp-recovery-architect rp-api-contract rp-backend-markets \
         rp-web rp-android rp-qa-e2e rp-sre-release rp-review-security; do
  [[ -f "$ROOT/.harness/agents/$a.agent.md" ]] && ok "agent: $a" || bad "missing agent: $a"
done

# 4. manifest paths exist
for p in $(python3 - <<EOF
import json
m=json.load(open("$ROOT/.harness/project.manifest.json"))
pr=m.get("products",{}).get("marketsV1",{})
print(pr.get("manifest",""))
print(pr.get("taskGraph",""))
print(pr.get("openApi",""))
print(pr.get("releasePolicy",""))
print(pr.get("evidenceRoot",""))
EOF
); do
  [[ -e "$ROOT/$p" ]] && ok "manifest path exists: $p" || bad "manifest path missing: $p"
done

# 5. no machine consumer points to removed old harness paths
#    (whitelist: binary rag blob, historical decision log, this validator itself)
if grep -rln "agent-harness/" "$ROOT/.harness" "$ROOT/AGENTS.md" "$ROOT/HARNESS.md" 2>/dev/null \
   | grep -vE "rag\.sqlite|DECISION_AND_ASSUMPTION_LOG\.md|validate-harness\.sh" | grep -q .; then
  bad "references to old agent-harness path remain"
else
  ok "no old agent-harness path references (machine-consumed)"
fi

# 6. old dir contains compatibility README only
OLD_FILES=$(find "$ROOT/.dev/markets-v1/agent-harness" -type f 2>/dev/null | wc -l)
if [[ "$OLD_FILES" -eq 1 ]]; then
  ok "old dir holds exactly the compatibility README"
else
  bad "old dir has $OLD_FILES files (expected 1 compatibility README)"
fi

# 7. canonical task graph / manifest (no duplicates)
TG="$ROOT/.harness/products/markets-v1/planning/task-graph.yaml"
IM="$ROOT/.harness/products/markets-v1/planning/implementation-manifest.yaml"
[[ -f "$TG" && ! -f "$ROOT/.dev/markets-v1/agent-harness/task-graph.yaml" ]] \
  && ok "task graph canonical (no duplicate)" || bad "task graph duplicate/missing"
[[ -f "$IM" && ! -f "$ROOT/.dev/markets-v1/agent-harness/implementation-manifest.yaml" ]] \
  && ok "implementation manifest canonical (no duplicate)" || bad "implementation manifest duplicate/missing"

# 8. RAG database not Git-tracked
if (cd "$ROOT" && git ls-files .harness/state/ | grep -qi "sqlite\|\.db"); then
  bad "RAG/db file is Git-tracked"
else
  ok "no RAG/db file Git-tracked"
fi

# 9. no obvious secret files added (docs naming 'secrets' are fine; only file types matter)
SECRETS=$(cd "$ROOT" && git status --porcelain 2>/dev/null | grep -iE "\.env$|\.env\.[a-z]+$|\.pem$|\.key$|id_rsa|credential[s]?\.(json|yaml|yml|txt)$|\.p12$|\.jks$|keystore" | grep -v "^ D" || true)
[[ -z "$SECRETS" ]] && ok "no secret files in change set" || bad "possible secret files:\n$SECRETS"

# 10. no product-code file changed by harness migration
PROD_CHANGED=$(cd "$ROOT" && git diff --name-only HEAD 2>/dev/null | grep -vE "^\.harness/|^\.dev/markets-v1/|^AGENTS\.md$|^HARNESS\.md$|^ORCHESTRATOR\.md$|^README\.md$|^\.gitignore$|^docs/markets-v1/|^\.dev/README\.md$" || true)
if [[ -n "$PROD_CHANGED" ]]; then
  bad "product/other files changed on harness branch:\n$PROD_CHANGED"
else
  ok "no product-code files changed"
fi

# 11. old/new agent names classified
UNCLASSIFIED=$(cd "$ROOT" && for f in .harness/agents/*.agent.md; do
  base=$(basename "$f")
  case "$base" in rp-*) ;; *) grep -q "REFERENCE / DISABLED FOR MARKETS-V1 RELEASE" "$f" || echo "$base";; esac
done)
[[ -z "$UNCLASSIFIED" ]] && ok "all legacy agents classified" || bad "unclassified legacy agents: $UNCLASSIFIED"

# 12. release policy files exist
for f in RELEASE_GOAL.md REPO_MAP.yaml ROUTING.yaml GATES.yaml HUMAN_GATES.yaml \
         RELEASE_STATE_SCHEMA.yaml WORKTREE_POLICY.md RESOURCE_POLICY.md RUNBOOK.md; do
  [[ -f "$ROOT/.harness/products/markets-v1/release/$f" ]] && ok "release file: $f" || bad "missing release file: $f"
done

# 13. no legacy agents enabled for release execution
LEGACY_ENABLED=$(python3 - <<EOF
import json
m=json.load(open("$ROOT/.harness/project.manifest.json"))
enabled=m.get("agents",{}).get("enabled",[])
print(" ".join(a for a in enabled if not a.startswith("rp-")))
EOF
)
[[ -z "$LEGACY_ENABLED" ]] && ok "no legacy agents enabled" || bad "legacy agents enabled: $LEGACY_ENABLED"

# 14. writer ownership collision check (ROUTING.yaml writable paths unique)
python3 - <<EOF
import sys, yaml
try:
    r = yaml.safe_load(open("$ROOT/.harness/products/markets-v1/release/ROUTING.yaml"))
    seen = {}
    for agent, spec in r.get("routing", {}).items():
        for w in spec.get("writable", []):
            if isinstance(w, str) and w != "kanban/tasks/state" and not w.startswith("~/"):
                if w in seen: print("  VIOLATION: writable path overlap:", w, seen[w], "&", agent); sys.exit(1)
                seen[w] = agent
    print("  ok: no writable-path ownership collisions")
except Exception as e:
    print("  VIOLATION: ROUTING.yaml check error:", e); sys.exit(1)
EOF
[[ $? -eq 0 ]] || FAIL=1

# 15. scripts executable
for s in reconcile-release-state.sh prepare-task-worktree.sh sync-android-gitlink.sh \
         verify-task.sh verify-release.sh bootstrap-hermes-fleet.sh validate-harness.sh; do
  [[ -x "$ROOT/.harness/scripts/$s" ]] && ok "script executable: $s" || bad "script not executable: $s"
done

echo
if [[ $FAIL -eq 0 ]]; then echo "== validate-harness PASS =="; else echo "== validate-harness FAIL =="; fi
exit $FAIL
