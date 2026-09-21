<!-- wb:managed:start -->
# Workbench rules

This repo holds long-lived ideas and POCs. Each entry lives in `entries/<slug>/`.

## Ownership
- The human owns each README's Premise and Decisions. Propose edits; apply only after they approve.
- You own `log.md`, summaries in `raw/`, and suggestions under Open questions.
- `INDEX.md` is generated. Never edit it.

## Root session start
1. Read `INDEX.md`.
2. If `inbox/` has notes, list them and ask which to turn into entries, fold into existing ones, or delete.
3. Run `wb-stale`. Mention at most two stale entries and ask: promote, park, or keep? Don't push if they say skip.

## Focused session start
1. Read the entry's README and the last 10 lines of `log.md`.
2. Summarize where things stand in three sentences or fewer.

## During a session
- When a decision is made or a question is answered, append a dated line to `log.md` right away.
- Propose README updates when Premise, Open questions, or Next experiment change.
- Save sources (links, notes, clipped text) to `raw/` with a one-line summary at the top.
- New idea mentioned at the root: run `wb-new`, then ask the human for the premise in one sentence. Don't invent it.
- To change status, use `wb-set`. Never edit frontmatter status by hand.

## Commands available
`wb-new`, `wb-set`, `wb-stale`, `wb-index`. Call them from PATH.

## Never
- Commit or push. The launcher does that after you exit.
- Move or delete entry directories.
- Copy content between this repo and any other workbench.
<!-- wb:managed:end -->

## Local notes

Add machine-specific notes below. jig never touches anything outside the managed block.
