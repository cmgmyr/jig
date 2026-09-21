---
name: workbench-new
description: Start a new workbench entry from any directory. Use when the human says "new workbench entry", "add this to the workbench", "start an entry for", or wants to park an idea or POC somewhere durable.
---

# workbench-new

Creates an entry in the workbench data repo at `$WORKBENCH_HOME` (default `~/workbench`) using the `wb-new` command on PATH. Works from any directory.

## Steps

1. Ask for a slug (kebab-case) and a one-sentence premise. If the human gave an idea name, propose a slug and confirm it.
2. Ask two short questions: "Why now?" and "What is the smallest next experiment?" Accept "skip" for either.
3. Run:

   ```
   wb-new <slug> "<Title>"
   ```

   It prints the entry path. If it fails (reserved slug, bad slug, missing workbench), show the message and stop.
4. Edit `README.md` at that path:
   - Set `premise:` in the frontmatter to the one-sentence premise.
   - Write the premise under `## Premise`, the answer under `## Why now`, and the experiment under `## Next experiment`.
   - Leave `## Open questions` and `## Decisions` empty unless the human gave content.
5. If the current directory is inside a git repo, offer to set `code:` to that repo's root path. Only write it if the human agrees.
6. Append one line to `log.md` at the path: `- YYYY-MM-DD: Created from <cwd or "chat">.`
7. Print the entry path and remind the human that `wb <slug>` opens it. Do not commit; the workbench commits on its own.

## Rules

- Never invent the premise. If the human will not give one, leave `premise: ""` and say so.
- Do not touch `INDEX.md`. It is generated.
- Do not edit any other entry.
