import { existsSync, mkdirSync, readdirSync, symlinkSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { commitAll, git, isRepo } from "./lib/git.ts";
import {
  JIG_VERSION, SCHEMA_VERSION, expandHome, fail, isWorkbench, readTemplate, workbenchHome, writeIndex,
} from "./lib/workbench.ts";

const args = process.argv.slice(2);
let name: string | undefined;
const positional: string[] = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--name") name = args[++i];
  else if (args[i] === "-h" || args[i] === "--help") {
    process.stdout.write("usage: wb-init [path] [--name <name>]\n");
    process.exit(0);
  } else positional.push(args[i]);
}

const target = resolve(expandHome(positional[0] ?? workbenchHome()));
if (isWorkbench(target)) fail(`${target} is already a workbench`);
if (existsSync(target) && readdirSync(target).some((n) => n !== ".git" && n !== ".DS_Store")) {
  fail(`${target} exists and is not empty; refusing to scaffold into it`);
}

mkdirSync(join(target, "inbox"), { recursive: true });
mkdirSync(join(target, "entries"), { recursive: true });
writeFileSync(join(target, "inbox", ".gitkeep"), "");
writeFileSync(join(target, "entries", ".gitkeep"), "");

writeFileSync(join(target, "AGENTS.md"), readTemplate("AGENTS.md"));
symlinkSync("AGENTS.md", join(target, "CLAUDE.md"));

const config = readTemplate("workbench.yml")
  .replace("{{name}}", name ?? basename(target))
  .replace("{{schema_version}}", String(SCHEMA_VERSION))
  .replace("{{jig_version}}", JIG_VERSION);
writeFileSync(join(target, ".workbench.yml"), config);
writeFileSync(join(target, ".gitignore"), readTemplate("gitignore"));

writeIndex(target);

if (!isRepo(target) || !existsSync(join(target, ".git"))) {
  const r = git(target, ["init", "-q", "-b", "main"]);
  if (!r.ok) fail(`git init failed: ${r.stderr.trim()}`);
}
const c = commitAll(target, "wb: init workbench");
if (!c.ok) fail(`initial commit failed: ${c.stderr.trim()}`);

process.stdout.write(`initialized workbench at ${target}\n`);
if (target !== workbenchHome()) {
  process.stdout.write(`note: WORKBENCH_HOME is ${workbenchHome()}; export WORKBENCH_HOME=${target} to use this one\n`);
}
