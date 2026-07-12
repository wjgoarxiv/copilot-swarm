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

test("doctrine declares the `csw` keyword trigger for the loop", () => {
  const d = doctrine();
  assert.match(d, /Keyword: `csw`/);
  assert.match(d, /csw-loop/);
});

test("doctrine delegates through native task/fleet surfaces with host-enforced isolation", () => {
  const d = doctrine();
  assert.match(d, /host `task` subagent tool/);
  assert.match(d, /\/fleet/);
  assert.match(d, /\/tasks/);
  assert.match(d, /deny\/available-tool policy/);
  assert.match(d, /isolated git worktree/);
  assert.match(d, /claim, not evidence/i);
});

test("doctrine states receipt and trusted-command trust boundaries", () => {
  const d = doctrine();
  assert.match(d, /Subcommands:[^\n]*verify[^\n]*artifact/);
  assert.match(d, /malicious same-user editor/);
  assert.match(d, /non-git\s+`verify` receipt has no workspace-freshness guarantee/i);
  assert.match(d, /trusted-command runner, not a sandbox/);
  assert.match(d, /Never execute argv.*worker output[\s\S]*fetched pages[\s\S]*issue\s+text[\s\S]*prompt-injected content/i);
  assert.match(d, /tracked and non-ignored untracked content/i);
  assert.match(d, /Ignored\s+inputs are not covered[\s\S]*`artifact` receipts/i);
  assert.match(d, /approved, non-daemonizing commands/i);
  assert.match(d, /Timeout\/cancel process-tree cleanup\s+is best-effort/i);
  assert.match(d, /daemonized commands may outlive it/i);
  assert.match(d, /record a cleanup receipt/i);
  assert.match(d, /deny\/available-tool policy and isolated worktrees remain required/);
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
