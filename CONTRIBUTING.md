# Contributing

jig is a personal tool, released low-key. Issues and small pull requests are welcome.

## Before a large change

Open an issue first. jig is built around one workbench per machine, plain markdown, and no dependencies. A change that loosens any of those is easier to talk through before you write it.

## Checks

```sh
./test/typecheck.sh
"$(readlink ~/.config/jig/node)" --test test/*.test.ts
./test/smoke.sh
```

All three run in CI on every pull request and on pushes to `main`. Run them locally first; [docs/development.md](docs/development.md) explains what each one covers and how to add a step to the smoke test when you change a user-visible flow.

## Writing and commits

Write short, active sentences. No em dashes. One line per paragraph in markdown; do not hard-wrap it.

Keep each commit to one concern, with a subject that says what changed and a body that says why when the diff does not make it obvious.
