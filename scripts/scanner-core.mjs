// Forbidden-token scanner core.
//
// SELF-CLEAN: the reference-identifying tokens are stored base64-encoded so the
// literal strings never appear in this source file. The scanner therefore scans
// clean against itself. See `# REFERENCE/_CSW_NOTES.md` (git-ignored) for the
// human-readable token list and rationale.
//
// Matching modes:
//   - "substr"   : case-insensitive plain substring (distinctive multi-char tokens)
//   - "boundary" : case-insensitive, must sit on identifier boundaries on both
//                  sides (prevents false positives on short/ambiguous tokens,
//                  e.g. the 3-letter ones inside ordinary words).
// Boundary chars: anything that is NOT [a-z0-9]. So `_`, `-`, `.`, `/`, space and
// string edges all count as boundaries.

import { readFileSync } from "node:fs";

const dec = (b64) => Buffer.from(b64, "base64").toString("utf8");

const SUBSTR_B64 = [
  "bGF6eWNvZGV4",
  "b2gtbXktb3BlbmFnZW50",
  "b2gtbXktb3BlbmNvZGU=",
  "c2lzeXBodXNsYWJz",
  "c2lzeXBodXMgbGFicw==",
  "eWVvbmd5dQ==",
  "bWlncmF0ZS1jb2RleC1jb25maWc=",
  "bGF6eWNsYXVkZQ==",
  "bGF6eWhlcm1lcw==",
  "dWx0cmFnb2Fs",
  "c3BhcmtzaGVsbA==",
];

const BOUNDARY_B64 = [
  "b21v",
  "Y29kZXg=",
  "YnVueA==",
  "bGN4",
  "bWV0aXM=",
  "bW9tdXM=",
  "aGVwaGFlc3R1cw==",
  "dWx0cmF3b3Jr",
  "dWx3",
  "Ym91bGRlcg==",
  "aGVybWVz",
];

/** Decoded token table: [{ token, mode }]. Computed once. */
export const TOKENS = [
  ...SUBSTR_B64.map((b) => ({ token: dec(b), mode: "substr" })),
  ...BOUNDARY_B64.map((b) => ({ token: dec(b), mode: "boundary" })),
];

const isIdentChar = (ch) => (ch >= "a" && ch <= "z") || (ch >= "0" && ch <= "9");

/** Find all token hits in a text string. Returns [{ token, mode, index }]. */
export function scanText(text, tokens = TOKENS) {
  const hay = text.toLowerCase();
  const hits = [];
  for (const { token, mode } of tokens) {
    const needle = token.toLowerCase();
    let from = 0;
    for (;;) {
      const idx = hay.indexOf(needle, from);
      if (idx === -1) break;
      from = idx + 1;
      if (mode === "boundary") {
        const before = idx > 0 ? hay[idx - 1] : "";
        const after = idx + needle.length < hay.length ? hay[idx + needle.length] : "";
        if (isIdentChar(before) || isIdentChar(after)) continue;
      }
      hits.push({ token, mode, index: idx });
    }
  }
  return hits;
}

/** Convert a byte offset in text to a 1-based line number. */
export function lineOf(text, index) {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i++) {
    if (text[i] === "\n") line++;
  }
  return line;
}

/** Heuristic: treat a buffer as binary if it contains a NUL in the first 8 KB. */
export function isBinaryBuffer(buf) {
  const n = Math.min(buf.length, 8192);
  for (let i = 0; i < n; i++) {
    if (buf[i] === 0) return true;
  }
  return false;
}

/**
 * Scan a list of files. For each: always scan the path string; for text files
 * also scan the contents. Binary files are path-only.
 * `readFile` is injectable for testing; defaults to fs.readFileSync.
 * Returns [{ file, where: "path"|"content", token, mode, line }].
 */
export function scanFileList(files, { readFile = readFileSync } = {}) {
  const findings = [];
  for (const file of files) {
    for (const hit of scanText(file)) {
      findings.push({ file, where: "path", token: hit.token, mode: hit.mode, line: 0 });
    }
    let buf;
    try {
      buf = readFile(file);
    } catch {
      continue; // unreadable (e.g. deleted) — path was still checked above
    }
    if (!Buffer.isBuffer(buf)) buf = Buffer.from(String(buf), "utf8");
    if (isBinaryBuffer(buf)) continue;
    const text = buf.toString("utf8");
    for (const hit of scanText(text)) {
      findings.push({
        file,
        where: "content",
        token: hit.token,
        mode: hit.mode,
        line: lineOf(text, hit.index),
      });
    }
  }
  return findings;
}

/** Format findings for human output. */
export function formatFindings(findings) {
  return findings
    .map((f) =>
      f.where === "path"
        ? `  ${f.file}: forbidden token in PATH (mode=${f.mode})`
        : `  ${f.file}:${f.line}: forbidden token in content (mode=${f.mode})`,
    )
    .join("\n");
}
