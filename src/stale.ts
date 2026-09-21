import { lastTouched, listEntries, requireWorkbench } from "./lib/workbench.ts";

const arg = process.argv[2];
if (arg === "-h" || arg === "--help") {
  process.stdout.write("usage: wb-stale [days]   (default 90)\n");
  process.exit(0);
}
const days = arg === undefined ? 90 : Number(arg);
if (!Number.isInteger(days) || days < 0) {
  process.stderr.write("wb: days must be a non-negative integer\n");
  process.exit(1);
}

const home = requireWorkbench();
const cutoff = Date.now() - days * 86_400_000;
const stale = listEntries(home)
  .filter((e) => !e.error && (e.data.status === "active" || e.data.status === "idle"))
  .map((e) => ({ e, touched: lastTouched(home, e) }))
  .filter(({ touched }) => touched !== "unknown" && new Date(touched).getTime() < cutoff)
  .sort((a, b) => a.touched.localeCompare(b.touched));

if (stale.length === 0) {
  process.stdout.write(`no active or idle entries untouched for ${days} days\n`);
} else {
  for (const { e, touched } of stale) {
    process.stdout.write(`${e.slug}\t${String(e.data.status)}\t${touched}\t${String(e.data.title)}\n`);
  }
}
