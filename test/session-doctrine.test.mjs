import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { doctrine } from "../hooks/session-doctrine.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const HOOK = join(repoRoot, "hooks/session-doctrine.mjs");

test("doctrine: includes the steering + delegation doctrine from AGENTS.md", () => {
  const d = doctrine();
  assert.ok(d);
  assert.match(d, /Copilot-swarm/);
  assert.match(d, /never weaken the completion bar/i);
  assert.match(d, /parallel/i);
});

test("doctrine: returns null if the doctrine file is unreadable", () => {
  assert.equal(doctrine(() => { throw new Error("nope"); }), null);
});

test("doctrine: returns null for empty/whitespace-only file", () => {
  assert.equal(doctrine(() => ""), null);
  assert.equal(doctrine(() => "   \n  "), null);
});

test("doctrine: clips oversized content with a truncation marker", () => {
  const d = doctrine(() => "x".repeat(20000));
  assert.ok(d.length < 20000);
  assert.match(d, /truncated/);
});

test("e2e: sessionStart hook emits additionalContext with doctrine", async () => {
  const out = await new Promise((resolve) => {
    const child = spawn(process.execPath, [HOOK], { stdio: ["pipe", "pipe", "pipe"] });
    let o = "";
    child.stdout.on("data", (d) => (o += d));
    child.on("close", () => resolve(o.trim()));
    child.stdin.write(JSON.stringify({ source: "startup", cwd: repoRoot }));
    child.stdin.end();
  });
  const r = JSON.parse(out);
  assert.match(r.additionalContext, /Copilot-swarm/);
  assert.match(r.additionalContext, /completion bar/i);
});

test("hooks.json registers sessionStart -> session-doctrine.mjs", () => {
  const h = JSON.parse(readFileSync(join(repoRoot, "hooks/hooks.json"), "utf8"));
  assert.ok(Array.isArray(h.hooks.sessionStart), "sessionStart must be registered");
  assert.match(h.hooks.sessionStart[0].bash, /session-doctrine\.mjs/);
});
