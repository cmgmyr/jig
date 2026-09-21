import { requireWorkbench, writeIndex } from "./lib/workbench.ts";

if (process.argv[2] === "-h" || process.argv[2] === "--help") {
  process.stdout.write("usage: wb-index\n");
  process.exit(0);
}

const home = requireWorkbench();
writeIndex(home);
process.stdout.write("INDEX.md updated\n");
