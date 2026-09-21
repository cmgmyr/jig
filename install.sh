#!/usr/bin/env bash
# Idempotent installer. Pins a Node interpreter, links wb and wb-* into
# ~/.local/bin, links skills into ~/.agents/skills and ~/.claude/skills.
#   JIG_NODE=/abs/path/to/node ./install.sh   pin a specific binary
set -euo pipefail

JIG_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
BIN_DIR="${JIG_BIN_DIR:-$HOME/.local/bin}"
AGENTS_SKILLS="${JIG_AGENTS_SKILLS:-$HOME/.agents/skills}"
CLAUDE_SKILLS="${JIG_CLAUDE_SKILLS:-$HOME/.claude/skills}"
NODE_LINK="${JIG_NODE_LINK:-$HOME/.config/jig/node}"
MIN_MAJOR=22 MIN_MINOR=18
BREW_NODE=/opt/homebrew/opt/node@24/bin/node

warn() { echo "install: warning: $*" >&2; }
die()  { echo "install: $*" >&2; exit 1; }

# 1. Resolve the interpreter. Never asdf shims, never `command -v node`.
if [ -n "${JIG_NODE:-}" ]; then
  node="$JIG_NODE"
elif [ -x "$BREW_NODE" ]; then
  node="$BREW_NODE"
else
  cat >&2 <<MSG
install: no Node interpreter to pin.

Either install Homebrew's keg-only node@24:
  brew install node@24 && ./install.sh
or point at an absolute Node binary (not a shim):
  JIG_NODE="\$(asdf where nodejs 24.x)/bin/node" ./install.sh
MSG
  exit 1
fi
[[ "$node" = /* ]] || die "JIG_NODE must be an absolute path: $node"
[ -x "$node" ] || die "$node is not an executable file"
case "$node" in */shims/*) die "$node is a version-manager shim; pin the real binary" ;; esac
if head -c 2 "$node" | grep -q '^#!'; then die "$node is a script, not a Node binary"; fi

# 2. Version check and symlink.
version="$("$node" --version)"; version="${version#v}"
major="${version%%.*}"; rest="${version#*.}"; minor="${rest%%.*}"
if [ "$major" -lt "$MIN_MAJOR" ] || { [ "$major" -eq "$MIN_MAJOR" ] && [ "$minor" -lt "$MIN_MINOR" ]; }; then
  die "$node is v$version; jig needs >= $MIN_MAJOR.$MIN_MINOR"
fi
mkdir -p "$(dirname "$NODE_LINK")"
if [ -e "$NODE_LINK" ] && [ ! -L "$NODE_LINK" ]; then
  die "$NODE_LINK exists and is not a symlink; move it aside"
fi
ln -sfn "$node" "$NODE_LINK"
echo "node: $NODE_LINK -> $node (v$version)"

# Links a symlink, replacing an existing symlink but never a real file.
link() {
  local target="$1" dest="$2"
  mkdir -p "$(dirname "$dest")"
  if [ -L "$dest" ]; then
    ln -sfn "$target" "$dest"
  elif [ -e "$dest" ]; then
    warn "skipping $dest: a real file or directory is already there"
    return 0
  else
    ln -s "$target" "$dest"
  fi
  echo "link: $dest -> $target"
}

# 3. wb and wb-* commands.
link "$JIG_ROOT/bin/wb" "$BIN_DIR/wb"
for f in "$JIG_ROOT"/src/*.ts; do
  name="$(basename "$f" .ts)"
  link "$JIG_ROOT/bin/jig-run" "$BIN_DIR/wb-$name"
done

# 4 and 5. Skills: jig -> ~/.agents/skills/<name> -> ~/.claude/skills/<name>.
# Claude Code 2.1.278 does not read ~/.agents/skills on its own, so both
# links are needed. Per-skill only; never link the whole directory.
for d in "$JIG_ROOT"/skills/*/; do
  name="$(basename "$d")"
  [ -f "$d/SKILL.md" ] || continue
  link "$JIG_ROOT/skills/$name" "$AGENTS_SKILLS/$name"
  link "$AGENTS_SKILLS/$name" "$CLAUDE_SKILLS/$name"
done

case ":$PATH:" in
  *":$BIN_DIR:"*) ;;
  *) warn "$BIN_DIR is not on PATH; add it to your shell config" ;;
esac

# 7. Doctor.
echo
"$JIG_ROOT/bin/wb" doctor || true
