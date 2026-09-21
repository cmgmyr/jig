import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { commitAll } from "./lib/git.ts";
import { fail, requireWorkbench, today } from "./lib/workbench.ts";

const args = process.argv.slice(2);
if (args[0] === "-h" || args[0] === "--help") {
  process.stdout.write('usage: wb-capture "text"   (or pipe text on stdin)\n');
  process.exit(0);
}

let text = args.join(" ").trim();
if (text === "" && !process.stdin.isTTY) text = readFileSync(0, "utf8").trim();
if (text === "") fail("nothing to capture");

const home = requireWorkbench();
const inbox = join(home, "inbox");
mkdirSync(inbox, { recursive: true });

const words = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").split("-").filter(Boolean).slice(0, 5).join("-") || "note";
let file = join(inbox, `${today()}-${words}.md`);
for (let n = 2; existsSync(file); n++) file = join(inbox, `${today()}-${words}-${n}.md`);

const stamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
writeFileSync(file, `# ${today()}\n\n${text}\n\n<!-- captured ${stamp} -->\n`);

const rel = file.slice(home.length + 1);
const c = commitAll(home, `wb(capture): ${rel}`);
if (!c.ok) fail(`wrote ${rel} but commit failed: ${c.stderr.trim()}`);
process.stdout.write(`${rel}\n`);
