import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  RESERVED_SLUGS, SCHEMA_VERSION, SLUG_RE, entriesDir, fail, readTemplate, requireWorkbench, today,
} from "./lib/workbench.ts";

const args = process.argv.slice(2);
if (args.length === 0 || args[0] === "-h" || args[0] === "--help") {
  process.stdout.write("usage: wb-new <slug> [title]\n");
  process.exit(args.length === 0 ? 1 : 0);
}

const [slug, ...titleParts] = args;
if (!SLUG_RE.test(slug)) fail(`slug "${slug}" must be kebab-case: lowercase letters, digits, single hyphens`);
if (RESERVED_SLUGS.includes(slug)) fail(`slug "${slug}" is reserved`);

const home = requireWorkbench();
const dir = join(entriesDir(home), slug);
if (existsSync(dir)) fail(`entry already exists: ${dir}`);

const title = titleParts.join(" ").trim() || slug.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

mkdirSync(join(dir, "raw"), { recursive: true });
writeFileSync(join(dir, "raw", ".gitkeep"), "");
const readme = readTemplate("entry-README.md")
  .replace("{{slug}}", slug)
  .replace("{{title}}", /[:#\[\],"']/.test(title) ? `"${title.replace(/["\\]/g, "\\$&")}"` : title)
  .replace("{{created}}", today())
  .replace("{{schema_version}}", String(SCHEMA_VERSION));
writeFileSync(join(dir, "README.md"), readme);
writeFileSync(join(dir, "log.md"), `- ${today()}: Created entry.\n`);

process.stdout.write(`${dir}\n`);
