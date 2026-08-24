#!/usr/bin/env bash
# Regression tests for exact Android gitlink pinning. Uses only temporary local Git repos.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
HELPER="$ROOT/.harness/scripts/sync-android-gitlink.sh"
REAL_GIT="$(command -v git)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

fail() { echo "FAIL: $*" >&2; exit 1; }
expect_success() { "$@" || fail "expected success: $*"; }
expect_failure() {
  local expected=$1
  shift
  local output
  if output=$("$@" 2>&1); then
    fail "expected failure: $*"
  elif [[ "$output" != *"$expected"* ]]; then
    printf 'unexpected failure output:\n%s\n' "$output" >&2
    fail "expected failure containing: $expected"
  fi
}
index_entry() { "$REAL_GIT" -C "$1" ls-files -s -- apps/android; }
assert_pinned() {
  local entry
  entry=$(index_entry "$1")
  [[ "$entry" == "160000 $2 0"$'\t'"apps/android" ]] || fail "unexpected gitlink index entry: $entry"
}
new_worktree() {
  local name=$1
  "$REAL_GIT" clone -q "$MONO_SOURCE" "$TMP/$name"
  "$REAL_GIT" -C "$TMP/$name" config user.email test@example.invalid
  "$REAL_GIT" -C "$TMP/$name" config user.name test
  printf '%s\n' "$TMP/$name"
}

"$REAL_GIT" init -q "$TMP/android-source"
"$REAL_GIT" -C "$TMP/android-source" config user.email test@example.invalid
"$REAL_GIT" -C "$TMP/android-source" config user.name test
printf 'first\n' >"$TMP/android-source/android.txt"
"$REAL_GIT" -C "$TMP/android-source" add android.txt
"$REAL_GIT" -C "$TMP/android-source" commit -qm first
INITIAL_SHA=$("$REAL_GIT" -C "$TMP/android-source" rev-parse HEAD)
printf 'target\n' >>"$TMP/android-source/android.txt"
"$REAL_GIT" -C "$TMP/android-source" commit -qam target -q
TARGET_SHA=$("$REAL_GIT" -C "$TMP/android-source" rev-parse HEAD)
"$REAL_GIT" -C "$TMP/android-source" worktree add -q -b android-linked "$TMP/android-linked" "$INITIAL_SHA"

"$REAL_GIT" init -q "$TMP/mono-source"
"$REAL_GIT" -C "$TMP/mono-source" config user.email test@example.invalid
"$REAL_GIT" -C "$TMP/mono-source" config user.name test
printf 'monorepo\n' >"$TMP/mono-source/README"
"$REAL_GIT" -C "$TMP/mono-source" add README
"$REAL_GIT" -C "$TMP/mono-source" commit -qm base
"$REAL_GIT" -C "$TMP/mono-source" update-index --add --cacheinfo "160000,$INITIAL_SHA,apps/android"
"$REAL_GIT" -C "$TMP/mono-source" commit -qm gitlink
MONO_SOURCE="$TMP/mono-source"

# The original helper rejects valid linked worktrees because .git is a file.
LINKED_WT="$TMP/mono-linked"
"$REAL_GIT" -C "$MONO_SOURCE" worktree add -q -b mono-linked "$LINKED_WT"
expect_success env RETROPICK_ANDROID_REPO="$TMP/android-source" "$HELPER" "$TARGET_SHA" "$LINKED_WT"
assert_pinned "$LINKED_WT" "$TARGET_SHA"
[[ ! -e "$LINKED_WT/apps/android/.git" ]] || fail "helper initialized or mutated child checkout"

NORMAL_WT=$(new_worktree normal)
expect_success env RETROPICK_ANDROID_REPO="$TMP/android-source" "$HELPER" "$TARGET_SHA" "$NORMAL_WT"
assert_pinned "$NORMAL_WT" "$TARGET_SHA"
[[ ! -e "$NORMAL_WT/apps/android/.git" ]] || fail "helper initialized or mutated child checkout"

SOURCE_LINKED_WT=$(new_worktree source-linked)
expect_success env RETROPICK_ANDROID_REPO="$TMP/android-linked" "$HELPER" "$TARGET_SHA" "$SOURCE_LINKED_WT"
assert_pinned "$SOURCE_LINKED_WT" "$TARGET_SHA"

expect_failure 'invalid SHA' env RETROPICK_ANDROID_REPO="$TMP/android-source" "$HELPER" not-a-sha "$NORMAL_WT"
expect_failure 'SHA not in Android repo' env RETROPICK_ANDROID_REPO="$TMP/android-source" "$HELPER" 0000000000000000000000000000000000000000 "$NORMAL_WT"

MODE_WT=$(new_worktree wrong-mode)
printf 'not-a-gitlink\n' >"$TMP/plain"
BLOB=$("$REAL_GIT" -C "$MODE_WT" hash-object -w "$TMP/plain")
"$REAL_GIT" -C "$MODE_WT" update-index --cacheinfo "100644,$BLOB,apps/android"
"$REAL_GIT" -C "$MODE_WT" commit -qm wrong-mode
"$REAL_GIT" -C "$MODE_WT" reset --hard -q
expect_failure 'must be a mode 160000 gitlink' env RETROPICK_ANDROID_REPO="$TMP/android-source" "$HELPER" "$TARGET_SHA" "$MODE_WT"

for kind in staged unstaged untracked; do
  DIRTY_WT=$(new_worktree "dirty-$kind")
  case "$kind" in
    staged) printf 'staged\n' >"$DIRTY_WT/staged"; "$REAL_GIT" -C "$DIRTY_WT" add staged ;;
    unstaged) printf 'changed\n' >>"$DIRTY_WT/README" ;;
    untracked) printf 'untracked\n' >"$DIRTY_WT/untracked" ;;
  esac
  expect_failure 'integration worktree dirty' env RETROPICK_ANDROID_REPO="$TMP/android-source" "$HELPER" "$TARGET_SHA" "$DIRTY_WT"
done

# A shim can force update-index to stage the old SHA; exact postcondition must reject it.
SHIM_DIR="$TMP/git-shim"
mkdir -p "$SHIM_DIR"
cat >"$SHIM_DIR/git" <<'SHIM'
#!/usr/bin/env bash
set -euo pipefail
args=("$@")
for i in "${!args[@]}"; do
  if [[ "${args[$i]}" == --cacheinfo ]] && (( i + 1 < ${#args[@]} )) && [[ "${args[$((i + 1))]}" == 160000,*apps/android ]]; then
    args[$((i + 1))]="160000,${GITLINK_TEST_INITIAL_SHA},apps/android"
  fi
done
exec "$GITLINK_TEST_REAL_GIT" "${args[@]}"
SHIM
chmod +x "$SHIM_DIR/git"
MISMATCH_WT=$(new_worktree mismatch)
expect_failure 'gitlink postcondition failed' env PATH="$SHIM_DIR:$PATH" GITLINK_TEST_REAL_GIT="$REAL_GIT" GITLINK_TEST_INITIAL_SHA="$INITIAL_SHA" RETROPICK_ANDROID_REPO="$TMP/android-source" "$HELPER" "$TARGET_SHA" "$MISMATCH_WT"

echo 'PASS: sync-android-gitlink exact gitlink regression tests'
