#!/usr/bin/env bash
# End-to-end run against a throwaway install and workbench. Touches nothing
# under $HOME: every path jig writes is redirected into a temp dir.
set -euo pipefail

JIG_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
TMP="$(mktemp -d "${TMPDIR:-/tmp}/jig-smoke.XXXXXX")"
trap 'rm -rf "$TMP"' EXIT

export JIG_BIN_DIR="$TMP/bin"
export JIG_AGENTS_SKILLS="$TMP/agents-skills"
export JIG_CLAUDE_SKILLS="$TMP/claude-skills"
export JIG_NODE_LINK="$TMP/config/node"
export WORKBENCH_HOME="$TMP/workbench"
export PATH="$JIG_BIN_DIR:$PATH"
export GIT_AUTHOR_NAME=smoke GIT_AUTHOR_EMAIL=smoke@example.com
export GIT_COMMITTER_NAME=smoke GIT_COMMITTER_EMAIL=smoke@example.com
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=commit.gpgsign GIT_CONFIG_VALUE_0=false
# Headless agent stub: always answers with one line.
export WB_AGENT_HEADLESS_CMD='echo "Stubbed summary of {prompt}" | cut -c1-40'

pass() { echo "  ok  $*"; }
fail() { echo "  FAIL $*" >&2; exit 1; }

if [ -z "${JIG_NODE:-}" ]; then
  if [ -L "$HOME/.config/jig/node" ]; then
    JIG_NODE="$(readlink "$HOME/.config/jig/node")"
  elif [ -x /opt/homebrew/opt/node@24/bin/node ]; then
    JIG_NODE=/opt/homebrew/opt/node@24/bin/node
  else
    fail "set JIG_NODE to an absolute Node >= 22.18 binary"
  fi
fi
export JIG_NODE

echo "install twice"
"$JIG_ROOT/install.sh" >"$TMP/install1.log" 2>&1 || { cat "$TMP/install1.log"; fail "first install"; }
"$JIG_ROOT/install.sh" >"$TMP/install2.log" 2>&1 || { cat "$TMP/install2.log"; fail "second install"; }
grep -q "install: warning" "$TMP/install2.log" && { cat "$TMP/install2.log"; fail "second install warned"; }
[ "$(ls "$JIG_BIN_DIR" | sort | uniq -d | wc -l)" -eq 0 ] || fail "duplicate links"
[ -L "$JIG_CLAUDE_SKILLS/workbench-new" ] || fail "skill link"
pass "install idempotent"

echo "init"
wb-init "$WORKBENCH_HOME" >/dev/null
for p in AGENTS.md CLAUDE.md .workbench.yml INDEX.md inbox entries .git; do
  [ -e "$WORKBENCH_HOME/$p" ] || fail "missing $p"
done
[ -L "$WORKBENCH_HOME/CLAUDE.md" ] || fail "CLAUDE.md not a symlink"
wb-init "$WORKBENCH_HOME" 2>/dev/null && fail "init should refuse an existing workbench"
pass "layout"

echo "new"
path="$(wb-new spades-game "Spades card game")"
[ -f "$path/README.md" ] && [ -f "$path/log.md" ] && [ -d "$path/raw" ] || fail "entry files"
grep -q "^id: spades-game$" "$path/README.md" || fail "id"
wb-new capture 2>/dev/null && fail "reserved slug accepted"
wb-new Bad_Slug 2>/dev/null && fail "bad slug accepted"
pass "entry created, bad slugs rejected"

echo "capture"
rel="$(wb-capture "test note")"
[ -f "$WORKBENCH_HOME/$rel" ] || fail "inbox file"
git -C "$WORKBENCH_HOME" log -1 --format=%s | grep -q "wb(capture)" || fail "capture commit"
[ -z "$(git -C "$WORKBENCH_HOME" status --porcelain)" ] || fail "capture left dirty tree"
pass "inbox note committed"

echo "post with changes"
echo "Some new thinking." >> "$path/README.md"
before="$(git -C "$WORKBENCH_HOME" rev-list --count HEAD)"
wb-post spades-game >"$TMP/post.log" 2>&1 || { cat "$TMP/post.log"; fail "post"; }
after="$(git -C "$WORKBENCH_HOME" rev-list --count HEAD)"
[ "$after" -eq $((before + 1)) ] || fail "post did not commit once"
git -C "$WORKBENCH_HOME" log -1 --format=%s | grep -q "^wb(spades-game): session " || fail "commit message"
grep -q "Stubbed summary" "$path/log.md" || { cat "$path/log.md"; fail "log line from headless stub"; }
grep -q "spades-game" "$WORKBENCH_HOME/INDEX.md" || fail "index"
pass "log line, index, commit"

echo "post with no changes"
before="$after"
wb-post >/dev/null
[ "$(git -C "$WORKBENCH_HOME" rev-list --count HEAD)" -eq "$before" ] || fail "empty post committed"
pass "no commit"

echo "post with failing headless agent"
echo "More." >> "$path/README.md"
WB_AGENT_HEADLESS_CMD='false' wb-post spades-game >/dev/null 2>&1
tail -1 "$path/log.md" | grep -q "session, no summary" || fail "fallback log line"
pass "fallback line"

echo "set and stale"
wb-set spades-game cold "Family lost interest" >/dev/null
grep -q "^status: cold$" "$path/README.md" || fail "status"
grep -q '^outcome: Family lost interest$' "$path/README.md" || fail "outcome"
wb-set spades-game active >/dev/null
wb-stale 0 | grep -q spades-game || fail "entry not listed at 0 days"
wb-stale 90 | grep -q spades-game && fail "fresh entry reported stale at 90 days"
wb-stale -1 2>/dev/null && fail "negative days accepted"
pass "status changes and stale"

echo "doctor"
wb-doctor >"$TMP/doctor.log" 2>&1 || { cat "$TMP/doctor.log"; fail "doctor"; }
rm "$WORKBENCH_HOME/CLAUDE.md"; echo "stale" > "$WORKBENCH_HOME/INDEX.md"
wb-doctor >/dev/null 2>&1 && fail "doctor missed broken CLAUDE.md and INDEX.md"
wb-doctor --fix >/dev/null 2>&1 || fail "doctor --fix"
[ -L "$WORKBENCH_HOME/CLAUDE.md" ] || fail "fix did not restore CLAUDE.md"
wb-doctor >/dev/null 2>&1 || fail "doctor after fix"
pass "checks and --fix"

echo "pinned node"
mkdir -p "$TMP/pinned18"; printf '#!/bin/sh\necho v18.20.0\n' > "$TMP/pinned18/node"; chmod +x "$TMP/pinned18/node"
echo "nodejs 18.20.0" > "$TMP/pinned18/.tool-versions"
(cd "$TMP/pinned18" && PATH="$TMP/pinned18:$PATH" wb-new tool-versions-test >/dev/null) || fail "wb-new under a Node 18 .tool-versions"
rm "$JIG_NODE_LINK"
out="$(wb-new should-fail 2>&1)" && fail "ran without pinned node"
echo "$out" | grep -q "install.sh" || fail "missing fix hint"
echo "$out" | grep -qi "at .*js\|node:internal" && fail "stack trace leaked"
pass "dispatcher refuses without the pin"

echo
echo "smoke: all passed"
