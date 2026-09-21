# Configuration

jig reads a handful of environment variables. Set them in your shell config. None are required on a machine with the defaults.

| Variable | Default | Purpose |
|---|---|---|
| `WORKBENCH_HOME` | `~/workbench` | Data repo root. Every `wb-*` command reads it, so they work from any directory. |
| `WB_AGENT` | `claude` | Which agent `wb` launches: `claude` or `codex`. |
| `WB_AGENT_CMD` | derived from `WB_AGENT` | The interactive launch command. `{prompt}` is replaced with the session prompt. |
| `WB_AGENT_HEADLESS_CMD` | derived from `WB_AGENT` | The non-interactive command `wb-post` uses to summarize a session. `{prompt}` is replaced with the request. |
| `JIG_NODE` | unset | Install-time only. Absolute path to the Node binary `install.sh` pins. See [install.md](install.md#the-interpreter-pin). |

## Agent commands

Defaults by agent:

| `WB_AGENT` | Interactive | Headless |
|---|---|---|
| `claude` | `claude "{prompt}"` | `claude -p "{prompt}"` |
| `codex` | `codex "{prompt}"` | `codex exec --skip-git-repo-check "{prompt}"` |

`{prompt}` is substituted as one shell argument, not spliced into the command text, so quotes and spaces in the prompt are safe. You can write `{prompt}`, `"{prompt}"`, or `'{prompt}'` in your override; all three become the same argument.

Examples:

```sh
# Claude with a specific model
export WB_AGENT_CMD='claude --model claude-opus-5 "{prompt}"'

# Codex in full-auto for headless summaries only
export WB_AGENT_HEADLESS_CMD='codex exec --full-auto "{prompt}"'

# A work machine that routes Claude through a gateway wrapper
export WB_AGENT_CMD='work-claude "{prompt}"'
export WB_AGENT_HEADLESS_CMD='work-claude -p "{prompt}"'
```

The headless command must print the summary on stdout. `wb-post` takes the last non-empty line, strips a leading dash or date if the agent added one, and appends it to `log.md`. Output longer than 40 words is treated as a failure and replaced with `session, no summary`.

## Two machines

Set `WORKBENCH_HOME` the same on both, or leave the default. The difference between machines is the data repo's remote and which agent `WB_AGENT` points at, not jig's configuration. Never point a work data repo at a personal remote, and never put either data repo in iCloud Drive, Dropbox, or another sync folder.

## Test-only overrides

`JIG_BIN_DIR`, `JIG_AGENTS_SKILLS`, `JIG_CLAUDE_SKILLS`, and `JIG_NODE_LINK` redirect every path `install.sh` and `wb doctor` write. `test/smoke.sh` uses them to install into a temp directory. You do not need them otherwise.
