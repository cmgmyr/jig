---
name: workbench-file
description: File the current conversation or session into a workbench entry. Use when Chris says "file this", "save this to the workbench", "log this session", "put this in the workbench", or wants decisions and sources from this chat recorded durably.
---

# workbench-file

Distills the current session into a workbench entry under `$WORKBENCH_HOME/entries/<slug>/` (default `~/workbench`). Works from any directory.

## Steps

1. Ask which entry. List candidates by reading `$WORKBENCH_HOME/INDEX.md`. If none fits, offer to create one with the `workbench-new` flow (`wb-new <slug> "<Title>"`).
2. Read the entry's `README.md` and the last 10 lines of `log.md` so you do not repeat what is already there.
3. Distill the session into three buckets:
   - **Log lines.** Decisions made, questions answered, dead ends hit. One line each, dated, under 25 words: `- YYYY-MM-DD: ...`
   - **README edits.** Proposed changes to `## Open questions` and `## Next experiment` only. Do not propose Premise or Decisions edits unless Chris asked for them.
   - **Sources.** Links, pasted text, transcripts worth keeping. Each becomes a file under `raw/` with a one-line summary as the first line. Name files `YYYY-MM-DD-<short-topic>.md`.
4. Append the log lines to `log.md` and write the `raw/` files. These need no approval.
5. Show the proposed README edits as a diff and wait for approval. Apply only what Chris approves.
6. Print what was written. Do not commit; the workbench commits on its own.

## Rules

- Never change `status:` by hand. Use `wb-set <slug> <status> ["outcome"]` and only when Chris asks.
- Never edit `INDEX.md`.
- Keep `log.md` append-only. Never rewrite earlier lines.
- Do not copy content from a different workbench (work vs personal).
