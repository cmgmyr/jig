# Commands

`wb` is the only command to remember. The `wb-*` commands are for the agent, and for you when you want to skip the agent.

## wb

```
wb                    launch the agent at the workbench root
wb <slug>             launch the agent focused on entries/<slug>
wb capture "text"     write an inbox note and commit (alias: wb c)
wb doctor [--fix]     check the install and the data repo
wb init [path]        scaffold a data repo (same as wb-init)
wb help
```

### What a launch does

1. Changes into `$WORKBENCH_HOME`. If it is not a workbench and you are at a terminal, it offers to create one. Non-interactive callers get an error and the `wb-init` command to run.
2. If the data repo has a git remote, runs `git pull --ff-only`. A failure (offline, diverged) prints a warning and continues.
3. Builds the prompt. Root: `Read AGENTS.md. Start a root session.` Focused: `Read AGENTS.md. Focus on entries/<slug>.`
4. Launches the interactive agent from the repo root. It never launches inside `entries/<slug>/`, because Claude Code does not reliably load `CLAUDE.md` and settings from parent directories.
5. When the agent exits, runs `wb-post <slug>` (or `wb-post` for a root session).

A wrong slug fails before launching and lists close matches.

### wb capture

Writes `inbox/<date>-<first-five-words>.md` and commits it as `wb(capture): <path>`. Text comes from the arguments, or from stdin when there are none:

```sh
wb c "spades: try a bidding phase before the trick phase"
pbpaste | wb c
```

No agent runs. The next root session lists inbox notes and asks what to do with each.

## Internal commands

All of them read `$WORKBENCH_HOME` and work from any directory.

### wb-init [path] [--name name]

Creates the data repo layout, writes `AGENTS.md` from the template, symlinks `CLAUDE.md` to it, writes `.workbench.yml` and an empty `INDEX.md`, runs `git init`, and makes the first commit. Refuses if the target is already a workbench or is a non-empty directory. `--name` defaults to the directory name.

### wb-new <slug> [title]

Validates the slug (kebab-case; not a reserved word like `capture`, `doctor`, `new`, `set`), creates `entries/<slug>/` from the template with `status: active` and today's date, writes a first log line, and prints the path. The title defaults to the slug in title case.

### wb-set <slug> <status> ["outcome"]

Changes `status` in the entry's frontmatter and appends a log line. `cold` and `promoted` require an outcome; `active` and `idle` refuse one. Regenerates the index. This is the only supported way to change status.

### wb-index

Rewrites `INDEX.md`. Entries are grouped by status in the order active, idle, promoted, cold, and sorted within each group by last commit, newest first. Each line has the title, the premise, and the last-touched date.

### wb-stale [days]

Lists `active` and `idle` entries with no commits in the last `days` (default 90), oldest first. Output is tab-separated: slug, status, last-touched date, title.

### wb-post [slug]

The post-session chores. Runs on its own after every `wb` launch; you can also run it by hand.

1. For each entry with uncommitted changes and no new line in `log.md`, sends the diff to the headless agent and asks for one dated line under 25 words. Appends it. If the call fails or exceeds 60 seconds, appends `session, no summary` instead.
2. Runs `wb-index`.
3. Commits everything as `wb(<slug|root>): session <date>`. Skips the commit when nothing changed.
4. Pushes if a remote exists. A failed push is a warning, not an error.

### wb-doctor [--fix]

Checks, in order:

- `WORKBENCH_HOME` points at a workbench.
- `~/.config/jig/node` is a symlink to a real Node binary, not a shim, reporting 22.18 or newer.
- `wb` and every `wb-<name>` for each `src/*.ts` are linked, and `command -v wb` resolves to jig's launcher.
- Each skill's link chain resolves, printed per skill.
- `.workbench.yml` `jig_version` matches jig's `VERSION` (warning only).
- `CLAUDE.md` is a symlink to `AGENTS.md`.
- The managed block in `AGENTS.md` matches the template.
- Every entry has valid frontmatter, a matching `id`, a valid `status`, and an `outcome` where required. A `code` path that does not exist on this machine is a warning.
- `INDEX.md` matches what `wb-index` would write.

`--fix` relinks commands and skills, restores the `CLAUDE.md` symlink, refreshes the managed block, and regenerates `INDEX.md`. It never deletes a real file or directory, never edits an entry, and never changes the pinned interpreter. Exit status is 1 when any error remains.
