# Sessions and skills

jig's job is to make the agent do the bookkeeping. This page describes what the agent is told, what happens around a session, and the two skills for working from outside the workbench.

## AGENTS.md and the managed block

Every workbench has an `AGENTS.md` at its root, and `CLAUDE.md` is a symlink to it, so Claude Code and Codex read the same rules. jig owns the part between `<!-- wb:managed:start -->` and `<!-- wb:managed:end -->`. It is copied from `templates/AGENTS.md` at init, and `wb doctor --fix` refreshes it when the template changes. Anything you write below the end marker is yours and is left alone.

The managed block tells the agent:

- **Ownership.** You own each README's Premise and Decisions; the agent proposes and waits. The agent owns `log.md`, summaries in `raw/`, and suggestions under Open questions. `INDEX.md` is generated and never edited.
- **Root session start.** Read `INDEX.md`. If `inbox/` has notes, list them and ask what to do with each. Run `wb-stale` and mention at most two stale entries: promote, park, or keep?
- **Focused session start.** Read the entry's README and the last 10 lines of `log.md`. Summarize where things stand in three sentences or fewer.
- **During a session.** Append a dated log line when a decision is made. Propose README edits when Premise, Open questions, or Next experiment change. Save sources to `raw/`. A new idea at the root means `wb-new`, then ask for the premise; never invent it. Change status only through `wb-set`.
- **Never.** Commit or push (the launcher does that). Move or delete entry directories. Copy content between this repo and any other workbench.

Write to `AGENTS.md` in place. Never write through `CLAUDE.md` with a temp-file-and-rename, since that replaces the symlink with a regular file and the two drift apart. `wb doctor` catches that case.

## Around a session

```
wb [slug]
  cd $WORKBENCH_HOME
  git pull --ff-only          (only if a remote exists; warn and continue on failure)
  <agent runs; you talk to it>
  wb-post [slug]
    headless agent writes a log line for any touched entry that has none
    wb-index
    git commit -m "wb(<slug|root>): session <date>"   (skipped if nothing changed)
    git push                  (only if a remote exists; warn on failure)
```

The headless call sends only the diff of that entry to the agent configured on the machine, with a 60 second timeout. Nothing else leaves the repo. On a work machine, that agent is whatever the company has approved.

## Two machines

The design assumes one workbench per machine and no syncing between them. Personal and work use the same jig and the same commands, with different data repos and different remotes. Cross-references between them are plain text: no links, no paths. `wb doctor` does not enforce this; it is a rule for you and the agent.

## Skills

Two skills are installed for use from any directory. They are harness-neutral: `name` and `description` frontmatter only, no harness-specific tool names, no `$CLAUDE_*` variables. They find the workbench through `$WORKBENCH_HOME` and act through `wb-*` on PATH.

### workbench-new

Trigger: you want to start an entry from wherever you are, usually inside a POC repo.

It asks for a slug and a one-sentence premise, then "why now" and the smallest next experiment. It runs `wb-new`, writes those answers into the README, and offers to set `code:` to the current repo's path. It never invents the premise.

### workbench-file

Trigger: you want the current conversation recorded in the workbench.

It asks which entry, or offers to create one. It distills the session into dated log lines for decisions and dead ends, proposed edits for Open questions and Next experiment, and sources saved under `raw/`. Log lines and `raw/` files are written without asking. README edits are shown as a diff and wait for your approval.

Neither skill commits. The next `wb` launch picks up the changes and `wb-post` commits them.
