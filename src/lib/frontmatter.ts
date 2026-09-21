export type Scalar = string | number | boolean | null;
export type Value = Scalar | Scalar[];
export type Frontmatter = Record<string, Value>;

export interface Parsed {
  data: Frontmatter;
  body: string;
}

export class FrontmatterError extends Error {}

const KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function parseScalar(raw: string): Scalar {
  const s = raw.trim();
  if (s === "" || s === "null" || s === "~") return null;
  if (s === "true") return true;
  if (s === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    const inner = s.slice(1, -1);
    if (s.startsWith('"')) return inner.replace(/\\(["\\])/g, "$1");
    return inner.replace(/''/g, "'");
  }
  if (s.startsWith("[") || s.startsWith("{") || s.startsWith("&") || s.startsWith("*") || s.startsWith("!")) {
    throw new FrontmatterError(`unsupported YAML syntax: ${s}`);
  }
  return s;
}

export function parseValue(raw: string): Value {
  const s = raw.trim();
  if (s.startsWith("[")) {
    if (!s.endsWith("]")) throw new FrontmatterError(`unterminated list: ${s}`);
    const inner = s.slice(1, -1).trim();
    if (inner === "") return [];
    return inner.split(",").map((item) => {
      const v = parseScalar(item);
      if (v === null && item.trim() === "") throw new FrontmatterError(`empty list item in: ${s}`);
      return v;
    });
  }
  return parseScalar(s);
}

export function parseFrontmatterBlock(text: string): Frontmatter {
  const data: Frontmatter = {};
  for (const rawLine of text.split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    if (line.trim() === "" || line.trim().startsWith("#")) continue;
    if (/^\s/.test(line)) throw new FrontmatterError(`nested or indented line not allowed: ${line}`);
    const idx = line.indexOf(":");
    if (idx < 1) throw new FrontmatterError(`expected "key: value": ${line}`);
    const key = line.slice(0, idx).trim();
    if (!KEY_RE.test(key)) throw new FrontmatterError(`bad key: ${key}`);
    if (key in data) throw new FrontmatterError(`duplicate key: ${key}`);
    const rest = line.slice(idx + 1);
    if (rest !== "" && !/^\s/.test(rest)) throw new FrontmatterError(`expected space after colon: ${line}`);
    data[key] = parseValue(rest);
  }
  return data;
}

export function parseDocument(text: string): Parsed {
  if (!text.startsWith("---\n")) throw new FrontmatterError("missing frontmatter");
  const end = text.indexOf("\n---\n", 4);
  if (end === -1) throw new FrontmatterError("unterminated frontmatter");
  const block = text.slice(4, end);
  const body = text.slice(end + 5);
  return { data: parseFrontmatterBlock(block), body };
}

export function formatScalar(v: Scalar): string {
  if (v === null) return '""';
  if (typeof v === "boolean" || typeof v === "number") return String(v);
  if (v === "") return '""';
  const needsQuote =
    /^[\s\-?:,\[\]{}#&*!|>'"%@`]/.test(v) ||
    /[:#\[\],]/.test(v) ||
    /\s$/.test(v) ||
    v === "true" || v === "false" || v === "null" || v === "~" ||
    /^-?\d+(\.\d+)?$/.test(v);
  return needsQuote ? `"${v.replace(/["\\]/g, "\\$&")}"` : v;
}

export function formatValue(v: Value): string {
  if (Array.isArray(v)) return `[${v.map(formatScalar).join(", ")}]`;
  return formatScalar(v);
}

export function formatDocument(data: Frontmatter, body: string): string {
  const lines = Object.entries(data).map(([k, v]) => `${k}: ${formatValue(v)}`);
  return `---\n${lines.join("\n")}\n---\n${body}`;
}
