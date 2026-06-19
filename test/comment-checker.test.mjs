import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { analyze, parseArgs, reminderFor } from "../hooks/comment-checker.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const HOOK = join(repoRoot, "hooks/comment-checker.mjs");

test("analyze: flags narrating/AI-slop comments", () => {
  const r = analyze("// import the thing\nimport x from 'x';\n// loop through items\nfor (const i of items) {}");
  assert.equal(r.flagged, true);
  assert.ok(r.hits.length >= 2);
});

test("analyze: does not flag intent-explaining comments", () => {
  assert.equal(analyze("// Retry twice because the upstream API is flaky under load\ndoThing();").flagged, false);
  // trigger-word comments that carry rationale or are long must NOT be flagged
  assert.equal(analyze("// Import restrictions may apply to this module in strict mode\nimport x from 'x';").flagged, false);
  assert.equal(analyze("// Initialize lazily since startup must stay fast\ninit();").flagged, false);
  assert.equal(analyze("// Call the API with retries -- it is flaky\napi();").flagged, false);
});

test("analyze: empty / non-string content is not flagged", () => {
  assert.equal(analyze("").flagged, false);
  assert.equal(analyze(null).flagged, false);
});

test("parseArgs: parses stringified JSON toolArgs (real Copilot shape)", () => {
  const a = parseArgs('{"path":"a.js","file_text":"// import x\\nx()"}');
  assert.equal(a.path, "a.js");
  assert.equal(parseArgs({ path: "b" }).path, "b");
  assert.equal(parseArgs("not json"), null);
});

test("reminderFor: builds a reminder for an edit tool with slop comments", () => {
  const payload = { toolName: "create", toolArgs: JSON.stringify({ path: "a.js", file_text: "// set x to 1\nlet x=1;" }) };
  const r = reminderFor(payload);
  assert.match(r, /comment check/i);
  assert.match(r, /explain WHY/);
});

test("reminderFor: redacts snippets and supports toolArguments shape", () => {
  const secret = "Bearer " + "A".repeat(12);
  const payload = { toolName: "write", toolArguments: { content: `// return result ${secret}\nreturn x;` } };
  const r = reminderFor(payload);
  assert.match(r, /line 1/);
  assert.doesNotMatch(r, new RegExp(secret));
  assert.match(r, /REDACTED/);
});

test("reminderFor: null for non-edit tools and clean edits", () => {
  assert.equal(reminderFor({ toolName: "shell", toolArgs: "{}" }), null);
  assert.equal(reminderFor({ toolName: "create", toolArgs: JSON.stringify({ path: "a.js", file_text: "let x=1;" }) }), null);
});

test("e2e: hook emits additionalContext for a slop edit, nothing for clean", async () => {
  const run = (payload) => new Promise((resolve) => {
    const c = spawn(process.execPath, [HOOK], { stdio: ["pipe", "pipe", "pipe"] });
    let o = ""; c.stdout.on("data", (d) => (o += d));
    c.on("close", () => resolve(o.trim()));
    c.stdin.write(JSON.stringify(payload)); c.stdin.end();
  });
  const slop = await run({ toolName: "create", toolArgs: JSON.stringify({ path: "a.js", file_text: "// return the result\nreturn r;" }) });
  assert.match(JSON.parse(slop).additionalContext, /comment check/i);
  const clean = await run({ toolName: "create", toolArgs: JSON.stringify({ path: "a.js", file_text: "return computeScore(user);" }) });
  assert.equal(clean, "");
});

test("hooks.json registers postToolUse -> comment-checker.mjs", () => {
  const h = JSON.parse(readFileSync(join(repoRoot, "hooks/hooks.json"), "utf8"));
  assert.ok(Array.isArray(h.hooks.postToolUse));
  assert.match(h.hooks.postToolUse[0].bash, /comment-checker\.mjs/);
});
