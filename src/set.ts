import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { formatDocument } from "./lib/frontmatter.ts";
import {
  STATUSES, type Status, appendLog, closeMatches, fail, listSlugs, readEntry, requireWorkbench, writeIndex,
} from "./lib/workbench.ts";

const args = process.argv.slice(2);
if (args.length < 2 || args[0] === "-h" || args[0] === "--help") {
  process.stdout.write(`usage: wb-set <slug> <${STATUSES.join("|")}> ["outcome"]\n`);
  process.exit(args.length < 2 ? 1 : 0);
}

const [slug, status, ...rest] = args;
const outcome = rest.join(" ").trim();
if (!STATUSES.includes(status as Status)) fail(`status must be one of ${STATUSES.join(", ")}`);

const home = requireWorkbench();
if (!listSlugs(home).includes(slug)) {
  const near = closeMatches(slug, listSlugs(home));
  fail(`no entry "${slug}"${near.length ? `. Did you mean: ${near.join(", ")}` : ""}`);
}

const entry = readEntry(home, slug);
if (entry.error) fail(`cannot parse entries/${slug}/README.md: ${entry.error}`);

const needsOutcome = status === "cold" || status === "promoted";
if (needsOutcome && outcome === "") {
  fail(status === "cold" ? 'cold needs a one-line reason: wb-set <slug> cold "why"' : 'promoted needs a destination: wb-set <slug> promoted "where it went"');
}
if (!needsOutcome && outcome !== "") fail(`${status} does not take an outcome`);

const previous = String(entry.data.status);
entry.data.status = status;
entry.data.outcome = needsOutcome ? outcome : "";
writeFileSync(join(entry.dir, "README.md"), formatDocument(entry.data, entry.body));

appendLog(home, slug, `Status ${previous} -> ${status}${outcome ? `. ${outcome}` : "."}`);
writeIndex(home);
process.stdout.write(`${slug}: ${previous} -> ${status}\n`);
