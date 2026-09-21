import assert from "node:assert/strict";
import { test } from "node:test";
import { FrontmatterError, formatDocument, parseDocument, parseFrontmatterBlock, parseValue } from "../src/lib/frontmatter.ts";

test("parses flat scalars and inline lists", () => {
  const data = parseFrontmatterBlock([
    "id: spades-game",
    "title: Spades card game",
    "outcome: \"\"",
    "tags: [games, swift]",
    "schema_version: 1",
    "empty: []",
    "quoted: \"a: b\"",
  ].join("\n"));
  assert.deepEqual(data, {
    id: "spades-game",
    title: "Spades card game",
    outcome: "",
    tags: ["games", "swift"],
    schema_version: 1,
    empty: [],
    quoted: "a: b",
  });
});

test("rejects nested blocks, block lists, and anchors", () => {
  assert.throws(() => parseFrontmatterBlock("a:\n  b: 1"), FrontmatterError);
  assert.throws(() => parseFrontmatterBlock("a:\n- x"), FrontmatterError);
  assert.throws(() => parseValue("&anchor x"), FrontmatterError);
  assert.throws(() => parseValue("{a: 1}"), FrontmatterError);
  assert.throws(() => parseFrontmatterBlock("a: 1\na: 2"), FrontmatterError);
  assert.throws(() => parseFrontmatterBlock("a:b"), FrontmatterError);
});

test("document round-trips through format and parse", () => {
  const doc = "---\nid: x\ntitle: \"Title: with colon\"\ntags: [a, b]\noutcome: \"\"\n---\n\n## Premise\n";
  const parsed = parseDocument(doc);
  assert.equal(parsed.body, "\n## Premise\n");
  const out = formatDocument(parsed.data, parsed.body);
  assert.deepEqual(parseDocument(out).data, parsed.data);
  assert.equal(parseDocument(out).body, parsed.body);
});

test("rejects missing or unterminated frontmatter", () => {
  assert.throws(() => parseDocument("# no frontmatter"), FrontmatterError);
  assert.throws(() => parseDocument("---\nid: x\n"), FrontmatterError);
});
