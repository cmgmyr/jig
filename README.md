# jig

Tooling for a personal workbench: one place per machine to keep ideas, POCs, and long-running AI conversations that outlive a chat but aren't projects yet. Entries are plain markdown in git. An agent does the bookkeeping. You remember one command: `wb`.

The data lives in a separate repo (default `~/workbench`). jig never syncs data between machines.

## Requirements

- macOS or Linux with bash and git.
- Node 22.18 or newer, pinned by absolute path. Homebrew's keg-only `node@24` is the default. Any real Node binary works through `JIG_NODE`. Version-manager shims (asdf, nvm, fnm) are rejected on purpose, so the interpreter never changes with the current directory.
- Claude Code or Codex on PATH.

## Install

```sh
git clone <this repo> ~/Code/cmgmyr/jig
cd ~/Code/cmgmyr/jig
./install.sh                                      # uses /opt/homebrew/opt/node@24/bin/node
JIG_NODE=/abs/path/to/bin/node ./install.sh       # or pin a specific binary
```

`install.sh` is idempotent. It writes the interpreter symlink at `~/.config/jig/node`, links `wb` and every `wb-*` into `~/.local/bin`, links each skill into `~/.agents/skills/<name>` and from there into `~/.claude/skills/<name>`, then prints `wb doctor`. It never overwrites a real file or directory; it warns and skips.

Claude Code 2.1.278 does not read `~/.agents/skills` on its own, so the second skill link is required. Re-check with a newer Claude Code before removing it.

Then create the data repo:

```sh
wb-init ~/workbench          # or just run `wb` and answer the prompt
```

## Use

| Command | What it does |
|---|---|
| `wb` | Pull if a remote exists, launch the agent at the workbench root, then run post-session chores. |
| `wb <slug>` | Same, focused on `entries/<slug>`. Suggests close matches if the slug is wrong. |
| `wb capture "text"` or `wb c "text"` | Write an inbox note and commit. No agent. |
| `wb doctor [--fix]` | Check the install and the data repo. `--fix` relinks, restores `CLAUDE.md`, regenerates `INDEX.md`, refreshes the managed block in `AGENTS.md`. It never edits entries. |

After the agent exits, `wb-post` runs: it asks the headless agent for a one-line log entry for each touched entry that has no new log line, regenerates `INDEX.md`, commits as `wb(<slug|root>): session <date>`, and pushes if a remote exists. If the headless call fails or takes longer than 60 seconds, it writes `session, no summary` and moves on.

### Internal commands

The agent calls these. They are on PATH as `wb-<name>`.

| Command | What it does |
|---|---|
| `wb-init [path] [--name n]` | Scaffold a data repo. Refuses if one is already there. |
| `wb-new <slug> [title]` | Create `entries/<slug>/` from the template. |
| `wb-set <slug> <status> ["outcome"]` | Change status. `cold` and `promoted` require an outcome. Appends a log line. |
| `wb-index` | Regenerate `INDEX.md`. |
| `wb-stale [days]` | List `active` and `idle` entries with no commits in `days` (default 90). |
| `wb-capture "text"` | Same as `wb capture`. |
| `wb-post [slug]` | Post-session chores, described above. |
| `wb-doctor [--fix]` | Same as `wb doctor`. |

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `WORKBENCH_HOME` | `~/workbench` | Data repo root. |
| `WB_AGENT` | `claude` | `claude` or `codex`. |
| `WB_AGENT_CMD` | `claude "{prompt}"` or `codex "{prompt}"` | Interactive launch. `{prompt}` is replaced with a single safe argument. |
| `WB_AGENT_HEADLESS_CMD` | `claude -p "{prompt}"` or `codex exec --skip-git-repo-check "{prompt}"` | Non-interactive summary call. |
| `JIG_NODE` | unset | Install-time only. Absolute Node binary to pin. |

## Data layout

```
~/workbench/
  AGENTS.md         managed block from jig, plus your local notes below it
  CLAUDE.md         symlink to AGENTS.md
  .workbench.yml    name, schema_version, jig_version
  INDEX.md          generated; never hand-edit
  inbox/            captured notes waiting for triage
  entries/<slug>/
    README.md       frontmatter plus Premise, Why now, Open questions, Next experiment, Decisions
    log.md          one dated line per event, append-only, agent-owned
    raw/            sources: links, clips, transcripts
```

Frontmatter is a strict YAML subset: flat keys, scalar values, and inline lists like `[a, b]`. `wb doctor` rejects anything else. Last-touched dates come from git, not from the files.

## Development

No build step and no npm dependencies. `package.json` exists only to mark the tree as ES modules so `tsc` and Node agree on module type. Node runs the `.ts` files directly through its built-in type stripping, so only erasable TypeScript is allowed.

```sh
"$(readlink ~/.config/jig/node)" --test test/*.test.ts   # unit tests
./test/smoke.sh                                          # end-to-end against a temp install and workbench
./test/typecheck.sh                                      # tsc --noEmit
```

The smoke test redirects every path jig writes (`JIG_BIN_DIR`, `JIG_AGENTS_SKILLS`, `JIG_CLAUDE_SKILLS`, `JIG_NODE_LINK`, `WORKBENCH_HOME`) into a temp dir and stubs the headless agent, so it touches nothing under your home directory.
