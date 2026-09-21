# Troubleshooting

Start with `wb doctor`. Most problems below show up there with the fix in the message.

## `~/.config/jig/node is missing or not a symlink`

`install.sh` has not run on this machine, or something removed `~/.config/jig`. Run:

```sh
brew install node@24 && cd ~/Code/jig && ./install.sh
```

or, without Homebrew, `JIG_NODE=/abs/path/to/bin/node ./install.sh`. See [install.md](install.md#the-interpreter-pin) for Herd, asdf, nvm, and fnm.

## `... -> ... does not exist or is not executable`

The pinned Node was removed, usually by a version manager cleaning up old versions or Herd switching versions. Re-run `install.sh` with `JIG_NODE` pointing at a version you intend to keep.

## `... looks like a version-manager shim`

`JIG_NODE` was set to an asdf, nvm, or fnm shim. Shims pick a version per directory, which is exactly what the pin exists to prevent. Use `asdf where nodejs <version>`, `nvm which <version>`, or the real path under the manager's install directory.

## `command -v wb resolves to ..., not jig's launcher`

Something else named `wb` is earlier on PATH, or `~/.local/bin` is not on PATH at all. Put `~/.local/bin` on PATH above the offending directory, or rename the other command.

## `wb: ~/workbench is not a workbench`

`WORKBENCH_HOME` points at a directory without `.workbench.yml`. Run `wb` from a terminal and answer the prompt, or `wb-init <path>`, or set `WORKBENCH_HOME` to the right place.

## Skills do not show up in Claude Code

Check `wb doctor`'s Skills section. Each skill needs two links: `~/.claude/skills/<name>` to `~/.agents/skills/<name>`, and that to jig. A real directory at either location blocks the link; `install.sh` warns and skips rather than overwrite. Move the directory aside and run `wb doctor --fix`.

Claude Code caches the skill list per session. Start a new session after linking.

## `CLAUDE.md is a regular file`

An editor or tool wrote through the symlink with a temp-file-and-rename, leaving a copy. Compare it with `AGENTS.md`, move anything you want to keep into `AGENTS.md` below the managed block, delete `CLAUDE.md`, and run `wb doctor --fix` to restore the link.

## `AGENTS.md managed block out of date`

jig's template changed since this workbench was initialized. `wb doctor --fix` replaces the block and leaves your local notes untouched.

## `wb-post` hangs or is slow

The headless agent call has a 60 second timeout, after which `wb-post` writes `session, no summary` and continues. If it consistently times out, check that `WB_AGENT_HEADLESS_CMD` works on its own:

```sh
claude -p "Reply with the word ok"
codex exec --skip-git-repo-check "Reply with the word ok"
```

A push after the commit has a 30 second timeout and warns on failure. Offline, `wb-post` finishes within about 70 seconds worst case.

## The session log line is wrong or unwanted

`log.md` is append-only by convention, but it is a text file. Edit it. The line came from the headless agent's reading of the diff; if it keeps misreading, the entry's README may be missing a premise for context.

## `wb-post` made no commit

Nothing changed under the workbench. This is the intended result of a session that only read things.

## Entries flagged by `wb doctor`

| Message | Fix |
|---|---|
| `id "x" does not match directory "y"` | Set `id` to the directory name. Never rename an entry directory to match; the history stays with the directory. |
| `invalid status` | Use `wb-set <slug> <status>`. |
| `status cold requires an outcome` | `wb-set <slug> cold "why"`. |
| `status active must have an empty outcome` | Clear `outcome` in the frontmatter, or change status with `wb-set`. |
| `nested or indented line not allowed` | The frontmatter uses YAML outside the subset. Flatten it. See [data-model.md](data-model.md#the-yaml-subset). |
| `code path ... not found on this machine` | A warning. The code lives on another machine, or moved. Update `code:` or ignore it. |

## Type stripping errors from Node

`wb-*` printed a syntax error naming a `.ts` file. Either the pinned Node is older than 22.18 (`wb doctor` reports the version) or a source file uses non-erasable TypeScript. `./test/typecheck.sh` finds the second case.
