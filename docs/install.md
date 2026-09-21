# Install details

The short version is in the [README](../README.md#install). This page covers the interpreter pin, version managers, the skill links, updating, and uninstalling.

## The interpreter pin

Every `wb-*` command is a symlink to `bin/jig-run`, which runs `src/<name>.ts` with one Node binary recorded as a symlink at `~/.config/jig/node`. jig never uses `#!/usr/bin/env node` and never calls `node` from PATH.

The reason is version managers. asdf, nvm, and fnm pick a Node version from the nearest `.tool-versions` or `.nvmrc`, walking up from the current directory. The skills run `wb-new` from inside other repos, and those repos may pin Node 18 or older. A PATH lookup would give a different interpreter depending on where you ran the command, and type stripping needs 22.18 or newer. Pinning by absolute path removes the variable.

`install.sh` resolves the binary in this order:

1. `$JIG_NODE`, if set. Must be an absolute path to a real binary. A shim (anything under a `shims/` directory, or a file that starts with `#!`) is refused.
2. `/opt/homebrew/opt/node@24/bin/node`, if it exists. Homebrew's `node@24` is keg-only, so it never lands on PATH and never fights a version manager.
3. Otherwise it prints both options and exits.

### Homebrew

```sh
brew install node@24
./install.sh
```

### Herd (macOS)

Herd manages Node through its own nvm. Point `JIG_NODE` at the version you want to keep:

```sh
JIG_NODE="$HOME/Library/Application Support/Herd/config/nvm/versions/node/v24.19.0/bin/node" ./install.sh
```

If Herd later removes that version, `wb doctor` reports a dangling link. Re-run `install.sh` with the new path.

### asdf

```sh
JIG_NODE="$(asdf where nodejs 24.11.0)/bin/node" ./install.sh
```

Use `asdf where`, never `asdf which`. The first prints the install directory; the second prints a shim.

### nvm or fnm

```sh
JIG_NODE="$(nvm which 24)" ./install.sh
JIG_NODE="$(fnm exec --using=24 which node)" ./install.sh
```

## What install.sh writes

| Path | Content |
|---|---|
| `~/.config/jig/node` | Symlink to the pinned Node binary. |
| `~/.local/bin/wb` | Symlink to `bin/wb`. |
| `~/.local/bin/wb-<name>` | One symlink to `bin/jig-run` per file in `src/`. |
| `~/.agents/skills/<name>` | Symlink to `skills/<name>` for each skill. |
| `~/.claude/skills/<name>` | Symlink to `~/.agents/skills/<name>`. |

It replaces its own symlinks on re-run and never touches a real file or directory. If one is in the way, it prints a warning and skips that path.

`~/.local/bin` must be on PATH. Put it above your version manager's block so `wb` resolves to jig's launcher and not to something else.

## Skill links

Skills live in this repo under `skills/`. They are linked into `~/.agents/skills/<name>`, the shared location harness-neutral skills use, and from there into `~/.claude/skills/<name>`. Claude Code 2.1.278 does not read `~/.agents/skills` on its own, so both links are needed. Per-skill links only: linking the whole directory would expose every skill in `~/.agents/skills` to Claude Code, which is not what you want on a shared machine.

If a newer Claude Code reads `~/.agents/skills` natively, the second link becomes redundant but harmless.

## Overriding paths

For tests or an unusual layout, these environment variables move every path `install.sh` and `wb doctor` touch:

| Variable | Default |
|---|---|
| `JIG_BIN_DIR` | `~/.local/bin` |
| `JIG_AGENTS_SKILLS` | `~/.agents/skills` |
| `JIG_CLAUDE_SKILLS` | `~/.claude/skills` |
| `JIG_NODE_LINK` | `~/.config/jig/node` |

`test/smoke.sh` uses them to install into a temp directory.

## Updating

```sh
cd ~/Code/jig && git pull && ./install.sh
```

`install.sh` relinks any new commands or skills. Then run `wb doctor`. A `jig_version` mismatch in `.workbench.yml` is a warning, not an error; it only matters once a schema migration exists.

## Uninstalling

```sh
rm ~/.local/bin/wb ~/.local/bin/wb-*
rm ~/.claude/skills/workbench-new ~/.claude/skills/workbench-file
rm ~/.agents/skills/workbench-new ~/.agents/skills/workbench-file
rm -r ~/.config/jig
```

The data repo at `~/workbench` is yours. jig never deletes it.
