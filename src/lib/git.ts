import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface GitResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  status: number | null;
}

export function git(cwd: string, args: string[], opts: { timeoutMs?: number } = {}): GitResult {
  const r = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    timeout: opts.timeoutMs,
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  });
  return {
    ok: r.status === 0,
    stdout: r.stdout ?? "",
    stderr: r.stderr ?? "",
    status: r.status,
  };
}

export function gitOut(cwd: string, args: string[]): string {
  return git(cwd, args).stdout.trim();
}

export function isRepo(cwd: string): boolean {
  return git(cwd, ["rev-parse", "--is-inside-work-tree"]).ok;
}

export function hasCommits(cwd: string): boolean {
  return git(cwd, ["rev-parse", "--verify", "HEAD"]).ok;
}

export function hasRemote(cwd: string): boolean {
  return gitOut(cwd, ["remote"]) !== "";
}

export function lastCommitDate(cwd: string, path: string): string | null {
  const out = gitOut(cwd, ["log", "-1", "--format=%cI", "--", path]);
  return out === "" ? null : out;
}

export function changedPaths(cwd: string): string[] {
  const out = git(cwd, ["status", "--porcelain", "--untracked-files=all"]).stdout;
  return out
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((l) => {
      const p = l.slice(3);
      const arrow = p.indexOf(" -> ");
      return arrow === -1 ? p : p.slice(arrow + 4);
    })
    .map((p) => (p.startsWith('"') ? JSON.parse(p) as string : p));
}

export function diffFor(cwd: string, path: string): string {
  const tracked = hasCommits(cwd)
    ? git(cwd, ["diff", "HEAD", "--", path]).stdout
    : git(cwd, ["diff", "--", path]).stdout;
  const untracked = git(cwd, ["ls-files", "--others", "--exclude-standard", "--", path]).stdout
    .split("\n")
    .filter((l) => l !== "");
  let out = tracked;
  for (const f of untracked) {
    out += `\n--- new file: ${f}\n${readSafe(cwd, f)}`;
  }
  return out;
}

function readSafe(cwd: string, rel: string): string {
  try {
    return readFileSync(join(cwd, rel), "utf8");
  } catch {
    return "";
  }
}

export function commitAll(cwd: string, message: string): GitResult {
  const add = git(cwd, ["add", "-A"]);
  if (!add.ok) return add;
  return git(cwd, ["commit", "-q", "-m", message]);
}
