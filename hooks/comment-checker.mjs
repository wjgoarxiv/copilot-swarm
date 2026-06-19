#!/usr/bin/env node
// Comment checker (postToolUse).
//
// After an edit, scans the written content for low-value / AI-slop comments and
// injects a gentle reminder via additionalContext (which Copilot CLI honors for
// postToolUse). It never blocks — it nudges. Real payload shape (verified live):
//   { toolName, toolArgs: <JSON string>, toolResult, cwd, ... }
//   toolArgs for edits parses to { path, file_text | content | new_str | ... }

import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { readStdin } from "./lib/read-stdin.mjs";
import { safeMode, sanitizeLine } from "../runtime/src/redact.mjs";

const EDIT_TOOLS = /^(create|write|edit|str[_-]?replace([_-]editor)?|multi[_-]?edit|apply[_-]?patch)$/i;
const CONTENT_KEYS = ["file_text", "content", "new_str", "new_string", "text", "new"];

// Comment lines that just narrate the code (low value / AI-slop).
const SLOP = [
  /^\s*(\/\/|#)\s*(import|imports|require)\b/i,
  /^\s*(\/\/|#)\s*(set|sets|setting)\s+\w+\s+(to|=)/i,
  /^\s*(\/\/|#)\s*(loop (over|through)|iterate (over|through))\b/i,
  /^\s*(\/\/|#)\s*(return|returns)\s+(the\s+)?(result|value|response)\b/i,
  /^\s*(\/\/|#)\s*(call|calls|invoke|invokes)\s+\w+/i,
  /^\s*(\/\/|#)\s*(this\s+(function|method|class|variable)\s+\w+)/i,
  /^\s*(\/\/|#)\s*(increment|decrement|initialize|declare)\b/i,
  /^\s*(\/\/|#)\s*(begin|start|end)\s+(of\s+)?\w+/i,
];

function extractContent(args) {
  if (!args || typeof args !== "object") return null;
  for (const k of CONTENT_KEYS) {
    if (typeof args[k] === "string") return args[k];
  }
  return null;
}

// Markers that a comment explains intent/rationale (so it is NOT slop even if it
// starts with a narration trigger word).
const INTENT = /\b(because|since|so that|so we|to avoid|to ensure|to prevent|in order to|when|unless|otherwise|note:|workaround|hack|caveat|gotcha|fixme:|todo:)\b|--|—/i;
const COMMENT_BODY = /^\s*(\/\/+|#+|\*)\s*(.*)$/;

/** Pure: analyze written content. Returns { flagged, hits:[{line, text}] }. */
export function analyze(content) {
  if (typeof content !== "string" || content === "") return { flagged: false, hits: [] };
  const hits = [];
  content.split("\n").forEach((line, i) => {
    if (!SLOP.some((re) => re.test(line))) return;
    const body = (line.match(COMMENT_BODY)?.[2] || "").trim();
    // Only flag short, clause-free narration; longer or intent-bearing comments pass.
    if (body.length > 50 || INTENT.test(body)) return;
    hits.push({ line: i + 1, text: sanitizeLine(line, 80) });
  });
  return { flagged: hits.length > 0, hits };
}

/** Parse the (possibly stringified) toolArgs into an object. */
export function parseArgs(toolArgs) {
  if (toolArgs && typeof toolArgs === "object" && !Array.isArray(toolArgs)) return toolArgs;
  if (typeof toolArgs === "string") {
    try { return JSON.parse(toolArgs); } catch { return null; }
  }
  return null;
}

/** Build the reminder for a payload, or null. Exported for tests. */
export function reminderFor(payload) {
  if (!payload || !EDIT_TOOLS.test(String(payload.toolName || ""))) return null;
  const args = parseArgs(payload.toolArgs ?? payload.toolArguments);
  const content = extractContent(args);
  const { flagged, hits } = analyze(content);
  if (!flagged) return null;
  const list = hits.slice(0, 5).map((h) => `  line ${h.line}: ${h.text}`).join("\n");
  return (
    `[CSW comment check] This edit added ${hits.length} comment(s) that appear to ` +
    `narrate the code rather than explain intent:\n${list}\n` +
    `Prefer comments that explain WHY (non-obvious rationale); delete comments that ` +
    `merely restate WHAT the code does.`
  );
}

async function main() {
  let payload = {};
  try { payload = JSON.parse((await readStdin()) || "{}"); } catch { payload = {}; }
  if (safeMode()) process.exit(0);
  const reminder = reminderFor(payload);
  if (reminder) process.stdout.write(JSON.stringify({ additionalContext: reminder }) + "\n");
  process.exit(0);
}

function isMainModule() {
  if (!process.argv[1]) return false;
  try { return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]); }
  catch { return fileURLToPath(import.meta.url) === process.argv[1]; }
}
if (isMainModule()) main();
