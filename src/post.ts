import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { runHeadless } from "./lib/agent.ts";
import { changedPaths, commitAll, diffFor, git, hasCommits, hasRemote } from "./lib/git.ts";
import { appendLog, fail, listSlugs, requireWorkbench, today, warn, writeIndex } from "./lib/workbench.ts";

const HEADLESS_TIMEOUT_MS = 60_000;

const arg = process.argv[2];
if (arg === "-h" || arg === "--help") {
  process.stdout.write("usage: wb-post [slug]\n");
  process.exit(0);
}

const home = requireWorkbench();
const focus = arg && arg !== "" ? arg : null;
if (focus && !listSlugs(home).includes(focus)) fail(`no entry "${focus}"`);

const changed = changedPaths(home);
const touchedSlugs = [...new Set(
  changed
    .filter((p) => p.startsWith("entries/"))
    .map((p) => p.split("/")[1])
    .filter((s) => s && listSlugs(home).includes(s)),
)];

for (const slug of touchedSlugs) {
  if (logHasNewLine(slug)) continue;
  const diff = diffFor(home, `entries/${slug}`).slice(0, 40_000);
  if (diff.trim() === "") continue;
  const line = summarize(slug, diff);
  appendLog(home, slug, line);
  process.stdout.write(`log ${slug}: ${line}\n`);
}

writeIndex(home);

if (changedPaths(home).length === 0) {
  process.stdout.write("nothing changed; no commit\n");
  process.exit(0);
}

const label = focus ?? "root";
const c = commitAll(home, `wb(${label}): session ${today()}`);
if (!c.ok) fail(`commit failed: ${c.stderr.trim()}`);
process.stdout.write(`committed wb(${label}): session ${today()}\n`);

if (hasRemote(home)) {
  const p = git(home, ["push", "-q"], { timeoutMs: 30_000 });
  if (!p.ok) warn(`push failed: ${p.stderr.trim().split("\n").pop() ?? "unknown error"}`);
  else process.stdout.write("pushed\n");
}

function logHasNewLine(slug: string): boolean {
  const rel = `entries/${slug}/log.md`;
  const path = join(home, rel);
  if (!existsSync(path)) return false;
  if (!hasCommits(home)) return readFileSync(path, "utf8").trim() !== "";
  const tracked = git(home, ["ls-files", "--error-unmatch", rel]).ok;
  if (!tracked) return readFileSync(path, "utf8").trim() !== "";
  const d = git(home, ["diff", "HEAD", "--", rel]).stdout;
  return d.split("\n").some((l) => l.startsWith("+- "));
}

function summarize(slug: string, diff: string): string {
  const prompt = [
    `You are summarizing a working session on workbench entry "${slug}".`,
    "Reply with ONE line, under 25 words, plain text, no date, no leading dash, no quotes.",
    "Describe what changed or was decided. If unclear, say what files were touched.",
    "",
    "Diff:",
    diff,
  ].join("\n");
  const r = runHeadless(home, prompt, HEADLESS_TIMEOUT_MS);
  const line = r.output.split("\n").map((l) => l.trim()).filter((l) => l !== "").pop() ?? "";
  const cleaned = line.replace(/^-\s*/, "").replace(/^\d{4}-\d{2}-\d{2}:\s*/, "").replace(/^["']|["']$/g, "").trim();
  if (!r.ok || cleaned === "" || cleaned.split(/\s+/).length > 40) {
    if (r.error) warn(`headless agent: ${r.error}`);
    return "session, no summary";
  }
  return cleaned;
}
