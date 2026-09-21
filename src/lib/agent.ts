import { spawnSync } from "node:child_process";

export function agentName(): string {
  return process.env.WB_AGENT ?? "claude";
}

export function headlessCommand(): string {
  if (process.env.WB_AGENT_HEADLESS_CMD) return process.env.WB_AGENT_HEADLESS_CMD;
  switch (agentName()) {
    case "claude":
      return 'claude -p "{prompt}"';
    case "codex":
      return 'codex exec --skip-git-repo-check "{prompt}"';
    default:
      throw new Error(`unknown WB_AGENT "${agentName()}"; set WB_AGENT_HEADLESS_CMD`);
  }
}

// Turns `claude -p "{prompt}"` into `claude -p "$1"` so the prompt is passed
// as a real argument instead of being interpolated into shell text.
export function shellTemplate(cmd: string): string {
  return cmd.replace(/"\{prompt\}"|'\{prompt\}'|\{prompt\}/g, '"$1"');
}

export interface HeadlessResult {
  ok: boolean;
  output: string;
  error?: string;
}

export function runHeadless(cwd: string, prompt: string, timeoutMs: number): HeadlessResult {
  let cmd: string;
  try {
    cmd = shellTemplate(headlessCommand());
  } catch (e) {
    return { ok: false, output: "", error: (e as Error).message };
  }
  const env = { ...process.env };
  delete env.CLAUDECODE;
  const r = spawnSync("bash", ["-c", cmd, "wb-agent", prompt], {
    cwd,
    encoding: "utf8",
    timeout: timeoutMs,
    stdio: ["ignore", "pipe", "pipe"],
    env,
  });
  if (r.error) return { ok: false, output: r.stdout ?? "", error: r.error.message };
  if (r.status !== 0) return { ok: false, output: r.stdout ?? "", error: `exit ${r.status}: ${(r.stderr ?? "").trim().split("\n").pop() ?? ""}` };
  return { ok: true, output: r.stdout ?? "" };
}
