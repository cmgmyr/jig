import { spawnSync } from "node:child_process";
import {
  existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, readlinkSync, realpathSync, symlinkSync, unlinkSync, writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  JIG_ROOT, JIG_VERSION, MANAGED_END, MANAGED_START, expandHome, isWorkbench, listEntries, managedBlock,
  readConfig, refreshManagedBlock, renderIndex, validateEntry, workbenchHome, writeIndex,
} from "./lib/workbench.ts";

const fix = process.argv.includes("--fix");
if (process.argv.includes("-h") || process.argv.includes("--help")) {
  process.stdout.write("usage: wb-doctor [--fix]\n");
  process.exit(0);
}

const MIN_NODE = [22, 18, 0];
const HOME = homedir();
const BIN = process.env.JIG_BIN_DIR ?? join(HOME, ".local", "bin");
const AGENTS_SKILLS = process.env.JIG_AGENTS_SKILLS ?? join(HOME, ".agents", "skills");
const CLAUDE_SKILLS = process.env.JIG_CLAUDE_SKILLS ?? join(HOME, ".claude", "skills");
const NODE_LINK = process.env.JIG_NODE_LINK ?? join(HOME, ".config", "jig", "node");

let errors = 0;
let warnings = 0;
const ok = (m: string) => process.stdout.write(`  ok    ${m}\n`);
const warn = (m: string) => { warnings++; process.stdout.write(`  warn  ${m}\n`); };
const err = (m: string) => { errors++; process.stdout.write(`  FAIL  ${m}\n`); };
const fixed = (m: string) => process.stdout.write(`  fixed ${m}\n`);

function section(title: string): void {
  process.stdout.write(`${title}\n`);
}

function linkTarget(p: string): string | null {
  try {
    return lstatSync(p).isSymbolicLink() ? readlinkSync(p) : null;
  } catch {
    return null;
  }
}

function isShim(realPath: string): boolean {
  if (/\/\.asdf\/shims\//.test(realPath) || /\/shims\//.test(realPath)) return true;
  try {
    const head = readFileSync(realPath, { encoding: "latin1" }).slice(0, 200);
    return head.startsWith("#!");
  } catch {
    return false;
  }
}

function ensureLink(target: string, linkPath: string, label: string): void {
  const current = linkTarget(linkPath);
  if (current !== null) {
    let resolved: string | null = null;
    try { resolved = realpathSync(linkPath); } catch { resolved = null; }
    if (resolved === realpathSync(target)) { ok(`${label} -> ${current}`); return; }
    if (fix) { unlinkSync(linkPath); symlinkSync(target, linkPath); fixed(`${label} relinked -> ${target}`); return; }
    err(`${label} points at ${current}, expected ${target}`);
    return;
  }
  if (existsSync(linkPath)) { err(`${label} is a real file or directory, not a symlink; move it aside`); return; }
  if (fix) { mkdirSync(dirname(linkPath), { recursive: true }); symlinkSync(target, linkPath); fixed(`${label} linked -> ${target}`); return; }
  err(`${label} missing (run install.sh or wb doctor --fix)`);
}

section("Environment");
const home = workbenchHome();
if (!isWorkbench(home)) err(`WORKBENCH_HOME ${home} is not a workbench (no .workbench.yml)`);
else ok(`WORKBENCH_HOME ${home}`);

section("Node interpreter");
{
  const link = linkTarget(NODE_LINK);
  if (link === null) {
    err(`${NODE_LINK} missing or not a symlink. Run: JIG_NODE=/abs/path/to/node ./install.sh`);
  } else {
    let real: string | null = null;
    try { real = realpathSync(NODE_LINK); } catch { real = null; }
    if (real === null) err(`${NODE_LINK} -> ${link} is dangling. Re-run install.sh with JIG_NODE`);
    else if (isShim(real)) err(`${real} looks like a version-manager shim. Pin a real binary with JIG_NODE`);
    else {
      const v = spawnSync(real, ["--version"], { encoding: "utf8" }).stdout?.trim() ?? "";
      const parts = v.replace(/^v/, "").split(".").map(Number);
      const okVersion = parts.length === 3 && (
        parts[0] > MIN_NODE[0] || (parts[0] === MIN_NODE[0] && (parts[1] > MIN_NODE[1] || (parts[1] === MIN_NODE[1] && parts[2] >= MIN_NODE[2])))
      );
      if (!okVersion) err(`${real} reports ${v || "no version"}; need >= 22.18.0`);
      else ok(`${real} (${v})`);
    }
  }
}

section("Commands on PATH");
{
  const commands = readdirSync(join(JIG_ROOT, "src")).filter((f) => f.endsWith(".ts")).map((f) => f.replace(/\.ts$/, ""));
  ensureLink(join(JIG_ROOT, "bin", "wb"), join(BIN, "wb"), "wb");
  for (const c of commands) ensureLink(join(JIG_ROOT, "bin", "jig-run"), join(BIN, `wb-${c}`), `wb-${c}`);
  const which = spawnSync("bash", ["-lc", "command -v wb"], { encoding: "utf8" }).stdout.trim();
  if (which === "") err(`wb is not on PATH; add ${BIN} to PATH`);
  else {
    let real = which;
    try { real = realpathSync(which); } catch { /* keep */ }
    if (real === realpathSync(join(JIG_ROOT, "bin", "wb"))) ok(`command -v wb -> ${which}`);
    else err(`command -v wb resolves to ${which}, not jig's launcher`);
  }
}

section("Skills");
{
  const skills = readdirSync(join(JIG_ROOT, "skills")).filter((n) => existsSync(join(JIG_ROOT, "skills", n, "SKILL.md")));
  for (const s of skills) {
    const src = join(JIG_ROOT, "skills", s);
    const agents = join(AGENTS_SKILLS, s);
    const claude = join(CLAUDE_SKILLS, s);
    ensureLink(src, agents, `~/.agents/skills/${s}`);
    ensureLink(agents, claude, `~/.claude/skills/${s}`);
    const chain = [claude, agents, src].map((p) => p.replace(HOME, "~")).join(" -> ");
    process.stdout.write(`        ${chain}\n`);
  }
}

if (isWorkbench(home)) {
  section("Workbench");
  let config: Record<string, unknown> = {};
  try {
    config = readConfig(home);
    if (config.jig_version !== JIG_VERSION) warn(`.workbench.yml jig_version ${String(config.jig_version)} != jig ${JIG_VERSION}`);
    else ok(`jig_version ${JIG_VERSION}`);
  } catch (e) {
    err(`.workbench.yml: ${(e as Error).message}`);
  }

  const claudeMd = join(home, "CLAUDE.md");
  const cl = linkTarget(claudeMd);
  if (cl === "AGENTS.md") ok("CLAUDE.md -> AGENTS.md");
  else if (cl !== null || !existsSync(claudeMd)) {
    if (fix) { if (cl !== null) unlinkSync(claudeMd); symlinkSync("AGENTS.md", claudeMd); fixed("CLAUDE.md -> AGENTS.md"); }
    else err(`CLAUDE.md ${cl === null ? "missing" : `points at ${cl}`}; expected symlink to AGENTS.md`);
  } else err("CLAUDE.md is a regular file; expected symlink to AGENTS.md. Merge it into AGENTS.md then rm CLAUDE.md");

  const agentsPath = join(home, "AGENTS.md");
  if (!existsSync(agentsPath)) {
    if (fix) { writeFileSync(agentsPath, refreshManagedBlock("")); fixed("AGENTS.md created"); }
    else err("AGENTS.md missing");
  } else {
    const content = readFileSync(agentsPath, "utf8");
    const s = content.indexOf(MANAGED_START);
    const e = content.indexOf(MANAGED_END);
    const current = s !== -1 && e !== -1 ? content.slice(s, e + MANAGED_END.length) : null;
    if (current === managedBlock()) ok("AGENTS.md managed block current");
    else if (fix) { writeFileSync(agentsPath, refreshManagedBlock(content)); fixed("AGENTS.md managed block refreshed"); }
    else err(`AGENTS.md managed block ${current === null ? "missing" : "out of date"} (wb doctor --fix)`);
  }

  const entries = listEntries(home);
  let bad = 0;
  for (const en of entries) {
    const problems = validateEntry(en);
    for (const p of problems) err(`entries/${en.slug}: ${p}`);
    if (problems.length) bad++;
    const code = en.data.code;
    if (typeof code === "string" && code !== "" && !/^[a-z]+:\/\//.test(code) && !existsSync(resolve(expandHome(code)))) {
      warn(`entries/${en.slug}: code path ${code} not found on this machine`);
    }
  }
  if (bad === 0) ok(`${entries.length} entr${entries.length === 1 ? "y" : "ies"} valid`);

  const indexPath = join(home, "INDEX.md");
  const currentIndex = existsSync(indexPath) ? readFileSync(indexPath, "utf8") : "";
  let expected: string;
  try {
    expected = renderIndex(home);
  } catch (e) {
    expected = "";
    err(`cannot render index: ${(e as Error).message}`);
  }
  if (expected !== "" && currentIndex === expected) ok("INDEX.md current");
  else if (expected !== "" && fix) { writeIndex(home); fixed("INDEX.md regenerated"); }
  else if (expected !== "") err("INDEX.md out of date (wb-index or wb doctor --fix)");
}

process.stdout.write(`\n${errors} error${errors === 1 ? "" : "s"}, ${warnings} warning${warnings === 1 ? "" : "s"}\n`);
process.exit(errors > 0 ? 1 : 0);
