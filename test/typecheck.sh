#!/usr/bin/env bash
# Runs tsc --noEmit without adding a package.json. TypeScript and @types/node
# come from the npx cache; typeRoots points tsc at that cache.
set -euo pipefail
JIG_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
node="$(readlink "${JIG_NODE_LINK:-$HOME/.config/jig/node}" 2>/dev/null || true)"
[ -x "${node:-}" ] || node="${JIG_NODE:?set JIG_NODE or run install.sh first}"
export PATH="$(dirname "$node"):$PATH"
npx --yes -p typescript@5 -p @types/node@24 sh -c '
  bin="$(command -v tsc)"; root="$(cd "$(dirname "$bin")/.." && pwd -P)"
  tsc --noEmit -p "$1" --typeRoots "$root/@types"
' _ "$JIG_ROOT/tsconfig.json"
