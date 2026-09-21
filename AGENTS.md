# jig

Tooling for Chris's workbench. This repo holds the scripts, templates, skills, and installer. The data repo is separate (`$WORKBENCH_HOME`, default `~/workbench`) and is never checked in here.

Read `README.md` for what the commands do and `.claude/plans/prd.md` for the full spec and phase plan. Build only the current phase. Do not build anything under "Deferred" or "Non-goals" in the PRD.

## Layout

- `bin/wb` is the only user-facing command. Bash. It cds into the workbench, launches the agent, then runs `wb-post`.
- `bin/jig-run` is the dispatcher. Every `wb-<name>` on PATH is a symlink to it. It resolves the pinned Node at `~/.config/jig/node` and runs `src/<name>.ts`.
- `src/*.ts` are the commands, one file per `wb-*`. Shared code goes in `src/lib/`. Adding a file to `src/` adds a command; `install.sh` and `wb doctor` pick it up on their own.
- `templates/` holds the AGENTS.md managed block, the entry README, and `.workbench.yml`.
- `skills/<name>/SKILL.md` are harness-neutral skills, linked into `~/.agents/skills` and `~/.claude/skills` by `install.sh`.
- `test/` holds `node:test` unit tests, `smoke.sh` (end to end against a temp install), and `typecheck.sh`.

## Rules

- No build step, no npm dependencies. `package.json` exists only for `"type": "module"`. Do not add scripts or dependencies to it.
- Only erasable TypeScript: no `enum`, no `namespace`, no constructor parameter properties. Relative imports include the `.ts` extension. Type-only imports use `import type`.
- No shebang in any `src/` file. Never invoke `node` from PATH; the interpreter check lives in `bin/jig-run` and `install.sh` only.
- Frontmatter is a strict YAML subset (flat keys, scalars, inline lists). Extend `src/lib/frontmatter.ts` only if the PRD data model changes.
- `wb doctor --fix` may relink, restore `CLAUDE.md`, regenerate `INDEX.md`, and refresh the managed block. It must never delete a real directory, edit entry content, or change the pinned interpreter.
- Skills stay harness-neutral: `name` and `description` frontmatter only, no Claude-specific tool names, no `$CLAUDE_*` variables, no paths relative to the skill file.
- Changing `templates/AGENTS.md` changes the managed block in every workbench. `wb doctor` flags the drift and `--fix` applies it.
- Do not commit or push unless Chris asks.

## Before finishing a change

```sh
./test/typecheck.sh
"$(readlink ~/.config/jig/node)" --test test/*.test.ts
./test/smoke.sh
```

All three must pass. If a change alters a user-visible flow, add a step to `test/smoke.sh`.
