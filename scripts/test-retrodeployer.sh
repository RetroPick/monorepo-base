#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RETRO="$ROOT/scripts/RETRODEPLOYER"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$TMP/upserts" "$TMP/bin"
printf '{"slug":"direction-btc"}\n' >"$TMP/upserts/01-direction.manual.json"
printf '{"slug":"threshold-eth"}\n' >"$TMP/upserts/02-threshold.manual.json"

cat >"$TMP/bin/fake-broadcast" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
base="${1##*/}"
case "$base" in
  *transient*)
    count_file="${RETRODEPLOYER_TEST_TRANSIENT_COUNT:?}"
    count="$(cat "$count_file" 2>/dev/null || echo 0)"
    count="$((count + 1))"
    printf '%s\n' "$count" >"$count_file"
    if [[ "$count" -lt 3 ]]; then
      echo 'Error: error sending request for url (https://sepolia.base.org/)' >&2
      echo 'Context:' >&2
      echo '- Error #0: client error (SendRequest)' >&2
      echo '- Error #1: connection error' >&2
      echo '- Error #2: peer closed connection without sending TLS close_notify' >&2
      exit 1
    fi
    echo 'transactionHash      0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
    ;;
  *unknown*)
    echo 'Error: execution reverted: SomeOtherError' >&2
    exit 1
    ;;
  *invalid-template*)
    echo 'Error: Failed to estimate gas: execution reverted, data: "0xec55b8cd": InvalidTemplate' >&2
    exit 1
    ;;
  *init.json)
    echo 'Error: Failed to estimate gas: execution reverted, data: "0x383682b6": EpochAlreadyExists' >&2
    exit 1
    ;;
  *open.json)
    echo 'Error: Failed to estimate gas: execution reverted, data: "0x383682b6": EpochAlreadyExists' >&2
    exit 1
    ;;
  *)
    echo 'transactionHash      0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    ;;
esac
SH
chmod +x "$TMP/bin/fake-broadcast"

cat >"$TMP/bin/fake-curl" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
out=""
url=""
method="GET"
while [[ $# -gt 0 ]]; do
  case "$1" in
    -o) out="${2:?}"; shift 2 ;;
    -w) shift 2 ;;
    -X) method="${2:?}"; shift 2 ;;
    --data-binary) shift 2 ;;
    -H|--max-time) shift 2 ;;
    -s|-S|-sS) shift ;;
    http*) url="$1"; shift ;;
    *) shift ;;
  esac
done
body='{}'
code=200
case "$url" in
  */api/v1/ops/global-state)
    body='{"environment":"test","chainId":84532,"indexer":{"lastSync":"2026-04-25T11:12:34Z"},"counts":{"templates":2,"rollingHalted":0,"openIncidents":0},"live":{"globalPaused":false,"yieldRouterDisabled":false,"totalUnreconciledRecovered":"0"}}'
    ;;
  */api/v1/ops/templates)
    body='{"templates":[{"templateId":"0xaaa","slug":"direction-btc","initialized":true,"activeEpochId":1,"haltedAtEpochId":0},{"templateId":"0xbbb","slug":"threshold-eth","initialized":true,"activeEpochId":0,"haltedAtEpochId":0}],"source":"indexed"}'
    ;;
  */api/v1/ops/incidents)
    body='{"incidents":[{"id":7,"severity":"critical","status":"open","kind":"YieldRouterDisabled","templateId":"0xaaa"}],"source":"indexed"}'
    ;;
  */api/v1/ops/keeper/schedule)
    body='{"schedule":[{"templateId":"0xaaa","epochId":1,"action":"lock","scheduledAt":"2026-04-25T12:00:00Z"}]}'
    ;;
  */api/v1/ops/keeper/executions)
    body='{"executions":[{"templateId":"0xaaa","epochId":1,"action":"open","status":"success"}]}'
    ;;
  */api/v1/ops/oracle/health)
    body='{"feeds":[],"note":"oracle_health table not migrated; no feed projections yet"}'
    ;;
  */api/v1/ops/live/global)
    body='{"globalPaused":true,"yieldRouterDisabled":true,"totalUnreconciledRecovered":"5"}'
    ;;
  */api/v1/ops/live/dispatcher/selector/*)
    body='{"selector":"0x12345678","module":"0x0000000000000000000000000000000000000001","isRoot":false}'
    ;;
  */api/v1/ops/tx/prepare)
    if [[ "$method" != "POST" ]]; then code=405; body='{"error":"method"}'; else
      body='{"target":"0x0000000000000000000000000000000000000001","chainId":84532,"abi":"IMarketEngine","function":"pauseProgram","calldata":"0x8456cb59","value":"0","requiredRole":"admin / governance (Safe)","runbookRef":"runbook","expectedEvents":["Paused"],"validationChecklist":["check"],"productionApproval":"Required","environment":"test"}'
    fi
    ;;
  *)
    code=404
    body='{"error":"not found"}'
    ;;
esac
if [[ -n "$out" ]]; then
  printf '%s\n' "$body" >"$out"
else
  printf '%s\n' "$body"
fi
printf '%s' "$code"
SH
chmod +x "$TMP/bin/fake-curl"

write_prepare_json() {
  local path="$1" fn="$2" calldata="$3"
  printf '{"function":"%s","target":"0x0000000000000000000000000000000000000001","calldata":"%s","chainId":84532}\n' "$fn" "$calldata" >"$path"
}

word_template="15de571597b78d4620f98fe88ceb62ebc3c88962dfff85a263ecfbe5f6d60676"
word_one="0000000000000000000000000000000000000000000000000000000000000001"
word_two="0000000000000000000000000000000000000000000000000000000000000002"
word_three="0000000000000000000000000000000000000000000000000000000000000003"
word_four="0000000000000000000000000000000000000000000000000000000000000004"

run_retro() {
  NO_COLOR=1 \
  UPSERT_DIR="$TMP/upserts" \
  RETRODEPLOYER_BROADCAST_SCRIPT="$TMP/bin/fake-broadcast" \
  RETRODEPLOYER_CURL_BIN="$TMP/bin/fake-curl" \
  RETRODEPLOYER_PREFLIGHT=0 \
  "$RETRO" "$@"
}

assert_contains() {
  local file="$1" needle="$2"
  if ! grep -Fq -- "$needle" "$file"; then
    echo "assert failed: expected '$needle' in $file" >&2
    echo "--- $file ---" >&2
    cat "$file" >&2
    exit 1
  fi
}

case "${1:-all}" in
all)
  d="$TMP/resume-init"
  mkdir -p "$d"
  write_prepare_json "$d/01-init.json" initializeMarket "0xe2fe583d$word_template"
  run_retro batch-send --yes --resume --manifest "$TMP/manifest-init.json" "$d" >"$TMP/resume-init.out" 2>&1
  assert_contains "$TMP/resume-init.out" "skip: initializeMarket"
  assert_contains "$TMP/resume-init.out" "already initialized"
  assert_contains "$TMP/manifest-init.json" '"status": "skipped"'

  d="$TMP/strict-init"
  mkdir -p "$d"
  write_prepare_json "$d/01-init.json" initializeMarket "0xe2fe583d$word_template"
  if run_retro batch-send --yes --strict "$d" >"$TMP/strict-init.out" 2>&1; then
    echo "assert failed: strict duplicate init should fail" >&2
    exit 1
  fi
  assert_contains "$TMP/strict-init.out" "EpochAlreadyExists"

  d="$TMP/resume-open"
  mkdir -p "$d"
  write_prepare_json "$d/01-open.json" openEpoch "0x11111111$word_template$word_one$word_two$word_three$word_four"
  run_retro batch-send --yes --resume --manifest "$TMP/manifest-open.json" "$d" >"$TMP/resume-open.out" 2>&1
  assert_contains "$TMP/resume-open.out" "skip: openEpoch"
  assert_contains "$TMP/resume-open.out" "epoch already exists"
  assert_contains "$TMP/manifest-open.json" '"epochId": "1"'

  d="$TMP/unknown"
  mkdir -p "$d"
  write_prepare_json "$d/01-unknown.json" initializeMarket "0xe2fe583d$word_template"
  printf '01-unknown.json\n' >"$d/order.lst"
  if run_retro batch-send --yes --resume "$d" >"$TMP/unknown.out" 2>&1; then
    echo "assert failed: unknown revert should fail in resume mode" >&2
    exit 1
  fi
  assert_contains "$TMP/unknown.out" "SomeOtherError"

  d="$TMP/invalid-template"
  mkdir -p "$d"
  write_prepare_json "$d/01-invalid-template.json" openEpoch "0x11111111$word_template$word_one$word_two$word_three$word_four"
  printf '01-invalid-template.json\n' >"$d/order.lst"
  if run_retro batch-send --yes --resume "$d" >"$TMP/invalid-template.out" 2>&1; then
    echo "assert failed: InvalidTemplate should fail in resume mode" >&2
    exit 1
  fi
  assert_contains "$TMP/invalid-template.out" "InvalidTemplate"
  assert_contains "$TMP/invalid-template.out" "upsert+initialize"

  d="$TMP/transient"
  mkdir -p "$d"
  write_prepare_json "$d/01-transient.json" openEpoch "0x11111111$word_template$word_one$word_two$word_three$word_four"
  printf '01-transient.json\n' >"$d/order.lst"
  count_file="$TMP/transient-count"
  RETRODEPLOYER_TEST_TRANSIENT_COUNT="$count_file" RETRODEPLOYER_SEND_RETRY_DELAY=0 \
    run_retro batch-send --yes --resume --retries 3 "$d" >"$TMP/transient.out" 2>&1
  assert_contains "$TMP/transient.out" "retry: openEpoch"
  assert_contains "$TMP/transient.out" "transactionHash"
  if [[ "$(cat "$count_file")" != "3" ]]; then
    echo "assert failed: expected transient broadcaster to run 3 times" >&2
    exit 1
  fi

  work="$TMP/resume-open-command"
  mkdir -p "$work/2-open"
  write_prepare_json "$work/2-open/01-transient.json" openEpoch "0x11111111$word_template$word_one$word_two$word_three$word_four"
  printf '01-transient.json\n' >"$work/2-open/order.lst"
  count_file="$TMP/resume-open-command-count"
  RETRODEPLOYER_TEST_TRANSIENT_COUNT="$count_file" RETRODEPLOYER_SEND_RETRY_DELAY=0 \
    run_retro resume-open --work-dir "$work" --retries 3 --retry-delay 0 --dry-run >"$TMP/resume-open-command.out" 2>&1
  assert_contains "$TMP/resume-open-command.out" "resume-open"
  assert_contains "$TMP/resume-open-command.out" "transactionHash"

  run_retro help >"$TMP/help.out" 2>&1
  assert_contains "$TMP/help.out" "Monitoring"
  assert_contains "$TMP/help.out" "Emergency"

  run_retro monitor overview >"$TMP/monitor-overview.out" 2>&1
  assert_contains "$TMP/monitor-overview.out" "RETRODEPLOYER monitor"
  assert_contains "$TMP/monitor-overview.out" "templates=2"
  assert_contains "$TMP/monitor-overview.out" "OK"

  run_retro monitor templates --active >"$TMP/monitor-templates.out" 2>&1
  assert_contains "$TMP/monitor-templates.out" "direction-btc"
  assert_contains "$TMP/monitor-templates.out" "published=true"
  assert_contains "$TMP/monitor-templates.out" "activeEpoch=1"

  run_retro monitor incidents >"$TMP/monitor-incidents.out" 2>&1
  assert_contains "$TMP/monitor-incidents.out" "YieldRouterDisabled"

  run_retro monitor global --live >"$TMP/monitor-live.out" 2>&1
  assert_contains "$TMP/monitor-live.out" "CRIT"
  assert_contains "$TMP/monitor-live.out" "globalPaused=true"

  emergency_dir="$TMP/emergency"
  run_retro emergency prepare pause true --out-dir "$emergency_dir" >"$TMP/emergency.out" 2>&1
  assert_contains "$TMP/emergency.out" "prepare-only"
  assert_contains "$TMP/emergency.out" "pauseProgram"
  if [[ ! -f "$emergency_dir/pauseProgram.json" ]]; then
    echo "assert failed: emergency prepare did not write pauseProgram.json" >&2
    exit 1
  fi
  assert_contains "$emergency_dir/pauseProgram.json" '"calldata"'

  # ───────── recover-feed-drift smoke ─────────
  # Stand up a self-contained mocked environment that simulates a stuck Open epoch whose
  # snapshotted oracleFeedId reverts with "No access" on a lockEpochsBatch dry-run.
  rfd_dir="$TMP/recover-feed-drift"
  mkdir -p "$rfd_dir/bin"
  rfd_state_counter="$rfd_dir/state-calls"
  rfd_broadcast_log="$rfd_dir/broadcast.log"
  rfd_cast_log="$rfd_dir/cast.log"
  printf '0\n' >"$rfd_state_counter"
  : >"$rfd_broadcast_log"
  : >"$rfd_cast_log"

  # fake-curl-rfd: state endpoint flips ae=1,lr=0 → ae=1,lr=1 between calls (first stuck, then post-cancel).
  cat >"$rfd_dir/bin/fake-curl-rfd" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
out=""
url=""
method="GET"
data_file=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    -o) out="${2:?}"; shift 2 ;;
    -w) shift 2 ;;
    -X) method="${2:?}"; shift 2 ;;
    --data-binary)
      arg="${2:?}"; shift 2
      if [[ "$arg" == @* ]]; then data_file="${arg:1}"; fi
      ;;
    -H|--max-time) shift 2 ;;
    -s|-S|-sS) shift ;;
    http*) url="$1"; shift ;;
    *) shift ;;
  esac
done
body='{}'
code=200
case "$url" in
  */api/v1/ops/templates/*/state)
    counter="${RFD_STATE_COUNTER:?}"
    n="$(cat "$counter" 2>/dev/null || echo 0)"
    n=$((n + 1))
    printf '%s\n' "$n" >"$counter"
    if [[ "$n" -le 1 ]]; then
      body='{"initialized":true,"executionMode":0,"activeEpochId":1,"lastResolvedEpochId":0,"version":3}'
    else
      body='{"initialized":true,"executionMode":0,"activeEpochId":1,"lastResolvedEpochId":1,"version":4}'
    fi
    ;;
  */api/v1/ops/tx/prepare)
    if [[ "$method" != "POST" ]]; then code=405; body='{"error":"method"}'; else
      fn=""
      if [[ -n "$data_file" && -f "$data_file" ]]; then
        fn="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1])).get("function",""))' "$data_file" 2>/dev/null || echo "")"
      fi
      case "$fn" in
        cancelEpoch)
          body='{"target":"0x0000000000000000000000000000000000000ABC","chainId":84532,"abi":"IMarketEngine","function":"cancelEpoch","calldata":"0xcafebabe","value":"0"}'
          ;;
        *)
          body='{"target":"0x0000000000000000000000000000000000000ABC","chainId":84532,"abi":"IMarketEngine","function":"lockEpochsBatch","calldata":"0xdeadbeef","value":"0"}'
          ;;
      esac
    fi
    ;;
  *)
    code=404
    body='{"error":"not found"}'
    ;;
esac
if [[ -n "$out" ]]; then
  printf '%s\n' "$body" >"$out"
else
  printf '%s\n' "$body"
fi
printf '%s' "$code"
SH
  chmod +x "$rfd_dir/bin/fake-curl-rfd"

  # fake-cast: routes admin() → known address, chain-id → 84532, and the lockEpochsBatch
  # dry-run (cast call <addr> 0xdeadbeef ...) → revert with "No access" matching the gated
  # Chainlink revert string.
  cat >"$rfd_dir/bin/cast" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
log="${RFD_CAST_LOG:?}"
printf 'cast %s\n' "$*" >>"$log"
case "${1:-}" in
  chain-id)
    echo "84532"
    ;;
  call)
    addr="${2:-}"
    payload="${3:-}"
    if [[ "$payload" == "admin()(address)" ]]; then
      echo "0x000000000000000000000000000000000000Ad11"
      exit 0
    fi
    if [[ "$payload" == 0xdeadbeef* ]]; then
      echo "Error: server returned an error response: error code 3: execution reverted, data: \"0x4e6f206163636573730000000000000000000000\"" >&2
      echo "execution reverted: No access" >&2
      exit 1
    fi
    echo "0x"
    ;;
  *)
    echo "fake-cast: unknown subcommand $*" >&2
    exit 2
    ;;
esac
SH
  chmod +x "$rfd_dir/bin/cast"

  # fake-broadcast-rfd: records the prepared file's function name to a log and exits success.
  cat >"$rfd_dir/bin/fake-broadcast-rfd" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
log="${RFD_BROADCAST_LOG:?}"
file="${1:?}"
fn="$(python3 -c 'import json,sys;d=json.load(open(sys.argv[1]));print(d.get("function",""))' "$file" 2>/dev/null || echo unknown)"
printf 'broadcast %s file=%s\n' "$fn" "$file" >>"$log"
echo "transactionHash      0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"
SH
  chmod +x "$rfd_dir/bin/fake-broadcast-rfd"

  rfd_template_id="0x15de571597b78d4620f98fe88ceb62ebc3c88962dfff85a263ecfbe5f6d60676"

  set +e
  PATH="$rfd_dir/bin:$PATH" \
  NO_COLOR=1 \
  UPSERT_DIR="$TMP/upserts" \
  RETRODEPLOYER_BROADCAST_SCRIPT="$rfd_dir/bin/fake-broadcast-rfd" \
  RETRODEPLOYER_CURL_BIN="$rfd_dir/bin/fake-curl-rfd" \
  RETRODEPLOYER_PREFLIGHT=0 \
  RETRODEPLOYER_INDEX_WAIT_SEC=0 \
  RFD_STATE_COUNTER="$rfd_state_counter" \
  RFD_BROADCAST_LOG="$rfd_broadcast_log" \
  RFD_CAST_LOG="$rfd_cast_log" \
  "$RETRO" recover-feed-drift "$rfd_template_id" --wait 0 >"$rfd_dir/run.out" 2>&1
  rfd_status=$?
  set -e

  if [[ "$rfd_status" -ne 0 ]]; then
    echo "assert failed: recover-feed-drift exited with $rfd_status" >&2
    echo "--- run.out ---" >&2
    cat "$rfd_dir/run.out" >&2
    echo "--- cast.log ---" >&2
    cat "$rfd_cast_log" >&2 || true
    echo "--- broadcast.log ---" >&2
    cat "$rfd_broadcast_log" >&2 || true
    exit 1
  fi
  assert_contains "$rfd_dir/run.out" "stuck open/locked epochId=1"
  assert_contains "$rfd_dir/run.out" "stale snapshotted feed detected"
  assert_contains "$rfd_dir/run.out" "preparing cancelEpoch"
  assert_contains "$rfd_dir/run.out" "next openEpoch will snapshot"
  # The lifecycle order is: dry-run lock (cast call) → cancelEpoch broadcast → state reload.
  # auto-deploy step [5/5] (the openEpoch call) is intentionally NOT inside the recover helper —
  # it runs afterward via the existing routing. So the broadcast log here must contain exactly
  # one cancelEpoch entry and zero openEpoch entries.
  assert_contains "$rfd_broadcast_log" "broadcast cancelEpoch"
  if grep -q 'broadcast openEpoch' "$rfd_broadcast_log"; then
    echo "assert failed: recover-feed-drift must not broadcast openEpoch (auto-deploy step [5/5] handles that)" >&2
    cat "$rfd_broadcast_log" >&2
    exit 1
  fi
  assert_contains "$rfd_cast_log" "cast call 0x0000000000000000000000000000000000000ABC admin()(address)"
  assert_contains "$rfd_cast_log" "cast call 0x0000000000000000000000000000000000000ABC 0xdeadbeef"

  # Also exercise the no-op short-circuit when state shows ae==lr (no stuck epoch).
  printf '5\n' >"$rfd_state_counter"   # advance counter so fake-curl returns the post-cancel body.
  set +e
  PATH="$rfd_dir/bin:$PATH" \
  NO_COLOR=1 \
  UPSERT_DIR="$TMP/upserts" \
  RETRODEPLOYER_BROADCAST_SCRIPT="$rfd_dir/bin/fake-broadcast-rfd" \
  RETRODEPLOYER_CURL_BIN="$rfd_dir/bin/fake-curl-rfd" \
  RETRODEPLOYER_PREFLIGHT=0 \
  RETRODEPLOYER_INDEX_WAIT_SEC=0 \
  RFD_STATE_COUNTER="$rfd_state_counter" \
  RFD_BROADCAST_LOG="$rfd_dir/broadcast2.log" \
  RFD_CAST_LOG="$rfd_dir/cast2.log" \
  "$RETRO" recover-feed-drift "$rfd_template_id" --wait 0 >"$rfd_dir/noop.out" 2>&1
  rfd_status=$?
  set -e
  if [[ "$rfd_status" -ne 0 ]]; then
    echo "assert failed: no-op recover-feed-drift exited with $rfd_status" >&2
    cat "$rfd_dir/noop.out" >&2
    exit 1
  fi
  assert_contains "$rfd_dir/noop.out" "no stuck epoch"
  if [[ -s "$rfd_dir/broadcast2.log" ]]; then
    echo "assert failed: no-op path must not invoke the broadcast script" >&2
    cat "$rfd_dir/broadcast2.log" >&2
    exit 1
  fi

  # ───────── greenfield init+open smoke ─────────
  # Drive _retro_greenfield_init_open directly (sourced) and assert it broadcasts
  # initializeMarket BEFORE openEpoch, with the expected unix-second offsets pinned to
  # the env knobs in the default path and the documented short windows under --fast.
  gf_dir="$TMP/greenfield"
  mkdir -p "$gf_dir/bin"
  gf_log="$gf_dir/calls.log"
  gf_args="$gf_dir/args.log"
  : >"$gf_log"
  : >"$gf_args"

  cat >"$gf_dir/bin/fake-curl-gf" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
out=""
url=""
method="GET"
data_file=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    -o) out="${2:?}"; shift 2 ;;
    -w) shift 2 ;;
    -X) method="${2:?}"; shift 2 ;;
    --data-binary)
      arg="${2:?}"; shift 2
      if [[ "$arg" == @* ]]; then data_file="${arg:1}"; fi
      ;;
    -H|--max-time) shift 2 ;;
    -s|-S|-sS) shift ;;
    http*) url="$1"; shift ;;
    *) shift ;;
  esac
done
body='{}'
code=200
case "$url" in
  */api/v1/ops/tx/prepare)
    if [[ "$method" != "POST" ]]; then code=405; body='{"error":"method"}'; else
      fn=""
      args_repr=""
      if [[ -n "$data_file" && -f "$data_file" ]]; then
        fn="$(python3 -c 'import json,sys;d=json.load(open(sys.argv[1]));print(d.get("function",""))' "$data_file" 2>/dev/null || echo "")"
        args_repr="$(python3 -c 'import json,sys;print(json.dumps(json.load(open(sys.argv[1])).get("args",[])))' "$data_file" 2>/dev/null || echo "[]")"
      fi
      printf 'prepare %s %s\n' "$fn" "$args_repr" >>"${GF_ARGS_LOG:?}"
      body='{"target":"0x0000000000000000000000000000000000000ABC","chainId":84532,"abi":"IMarketEngine","function":"'"$fn"'","calldata":"0xfeedface","value":"0"}'
    fi
    ;;
  *)
    code=404
    body='{"error":"not found"}'
    ;;
esac
if [[ -n "$out" ]]; then
  printf '%s\n' "$body" >"$out"
else
  printf '%s\n' "$body"
fi
printf '%s' "$code"
SH
  chmod +x "$gf_dir/bin/fake-curl-gf"

  # Default-offsets run: source RETRODEPLOYER, stub the broadcast helper to record
  # each prepared file's function name in order, then call _retro_greenfield_init_open.
  (
    set -euo pipefail
    export NO_COLOR=1
    export UPSERT_DIR="$TMP/upserts"
    export RETRODEPLOYER_CURL_BIN="$gf_dir/bin/fake-curl-gf"
    export RETRODEPLOYER_PREFLIGHT=0
    export RETRODEPLOYER_INDEX_WAIT_SEC=0
    export RETRODEPLOYER_OPEN_OFFSET_SEC=12
    export RETRODEPLOYER_LOCK_OFFSET_SEC=34
    export RETRODEPLOYER_RESOLVE_OFFSET_SEC=56
    export GF_LOG="$gf_log"
    export GF_ARGS_LOG="$gf_args"

    # shellcheck disable=SC1090
    source "$RETRO"

    _send_prepared_resume_safe() {
      local f="$1" fn
      fn="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1])).get("function",""))' "$f")"
      printf 'send %s\n' "$fn" >>"$GF_LOG"
      return 0
    }

    _retro_greenfield_init_open 01 0xdf1cfb8f2934fba09cf6c4f20292af00078e861bfd7e9afe26020a9c12b05320 \
      >"$gf_dir/default.out" 2>&1
  )

  assert_contains "$gf_dir/default.out" "initializeMarket → openEpoch"
  if [[ "$(cat "$gf_log")" != $'send initializeMarket\nsend openEpoch' ]]; then
    echo "assert failed: greenfield default order should be init then open" >&2
    echo "--- calls.log ---" >&2
    cat "$gf_log" >&2
    echo "--- default.out ---" >&2
    cat "$gf_dir/default.out" >&2
    exit 1
  fi
  # Verify offsets propagated: the openEpoch args[3]-args[2] (lock-open) should match
  # RETRODEPLOYER_LOCK_OFFSET_SEC - RETRODEPLOYER_OPEN_OFFSET_SEC = 34 - 12 = 22, and
  # args[4]-args[3] (resolve-lock) = 56 - 34 = 22.
  python3 - "$gf_args" <<'PY'
import json, sys
seen_init = False
seen_open = False
with open(sys.argv[1]) as f:
    for line in f:
        line = line.rstrip("\n")
        if not line:
            continue
        kind, rest = line.split(" ", 1)
        if kind != "prepare":
            continue
        fn, args_json = rest.split(" ", 1)
        args = json.loads(args_json)
        if fn == "initializeMarket":
            assert args == ["0xdf1cfb8f2934fba09cf6c4f20292af00078e861bfd7e9afe26020a9c12b05320"], (
                f"initializeMarket args mismatch: {args}"
            )
            seen_init = True
        elif fn == "openEpoch":
            tid, eid, oa, la, ra = args
            assert tid == "0xdf1cfb8f2934fba09cf6c4f20292af00078e861bfd7e9afe26020a9c12b05320"
            assert int(eid) == 1, f"epochId={eid}"
            assert int(la) - int(oa) == 22, f"lock-open delta = {int(la)-int(oa)} (want 22)"
            assert int(ra) - int(la) == 22, f"resolve-lock delta = {int(ra)-int(la)} (want 22)"
            seen_open = True
assert seen_init and seen_open, "must see prepare for initializeMarket and openEpoch"
PY

  # --fast run: should print the short-window offsets banner and use (10, 45, 90) deltas.
  : >"$gf_log"
  : >"$gf_args"
  (
    set -euo pipefail
    export NO_COLOR=1
    export UPSERT_DIR="$TMP/upserts"
    export RETRODEPLOYER_CURL_BIN="$gf_dir/bin/fake-curl-gf"
    export RETRODEPLOYER_PREFLIGHT=0
    export RETRODEPLOYER_INDEX_WAIT_SEC=0
    unset RETRODEPLOYER_OPEN_OFFSET_SEC RETRODEPLOYER_LOCK_OFFSET_SEC RETRODEPLOYER_RESOLVE_OFFSET_SEC
    export GF_LOG="$gf_log"
    export GF_ARGS_LOG="$gf_args"

    # shellcheck disable=SC1090
    source "$RETRO"

    _send_prepared_resume_safe() {
      local f="$1" fn
      fn="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1])).get("function",""))' "$f")"
      printf 'send %s\n' "$fn" >>"$GF_LOG"
      return 0
    }

    _retro_greenfield_init_open 01 0xdf1cfb8f2934fba09cf6c4f20292af00078e861bfd7e9afe26020a9c12b05320 --fast \
      >"$gf_dir/fast.out" 2>&1
  )
  assert_contains "$gf_dir/fast.out" "--fast offsets  open=+10s  lock=+45s  resolve=+90s"
  python3 - "$gf_args" <<'PY'
import json, sys
with open(sys.argv[1]) as f:
    for line in f:
        if "openEpoch" not in line:
            continue
        _, fn, args_json = line.rstrip("\n").split(" ", 2)
        args = json.loads(args_json)
        oa, la, ra = int(args[2]), int(args[3]), int(args[4])
        assert la - oa == 35, f"--fast lock-open delta {la-oa} (want 35)"
        assert ra - la == 45, f"--fast resolve-lock delta {ra-la} (want 45)"
        break
    else:
        raise SystemExit("never saw openEpoch in --fast run")
PY

  # --prepare-only run: must NOT call the broadcast helper and must leave prepared JSONs.
  : >"$gf_log"
  : >"$gf_args"
  (
    set -euo pipefail
    export NO_COLOR=1
    export UPSERT_DIR="$TMP/upserts"
    export RETRODEPLOYER_CURL_BIN="$gf_dir/bin/fake-curl-gf"
    export RETRODEPLOYER_PREFLIGHT=0
    export RETRODEPLOYER_INDEX_WAIT_SEC=0
    export GF_LOG="$gf_log"
    export GF_ARGS_LOG="$gf_args"

    # shellcheck disable=SC1090
    source "$RETRO"

    _send_prepared_resume_safe() {
      printf 'send %s\n' "$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1])).get("function",""))' "$1")" >>"$GF_LOG"
      return 0
    }

    _retro_greenfield_init_open 01 0xdf1cfb8f2934fba09cf6c4f20292af00078e861bfd7e9afe26020a9c12b05320 --prepare-only \
      >"$gf_dir/prep.out" 2>&1
  )
  if [[ -s "$gf_log" ]]; then
    echo "assert failed: --prepare-only must not invoke the broadcast helper" >&2
    cat "$gf_log" >&2
    exit 1
  fi
  assert_contains "$gf_dir/prep.out" "--prepare-only → initializeMarket prepared"
  assert_contains "$gf_dir/prep.out" "--prepare-only → openEpoch prepared"

  echo "RETRODEPLOYER tests passed"
  ;;
*)
  echo "usage: $0 [all]" >&2
  exit 1
  ;;
esac
