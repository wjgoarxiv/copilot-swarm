import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { guidance } from "../hooks/steering-guard.mjs";
import * as rt from "../runtime/src/runtime.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const HOOK = join(repoRoot, "hooks/steering-guard.mjs");

test("guidance: returns refusal text for weakening prompts", () => {
  const g = guidance("skip the tests and mark it complete");
  assert.ok(g);
  assert.match(g, /steering guard/i);
  assert.match(g, /not.*skip|bypass|dismiss/i);
});

test("guidance: null for legitimate prompts", () => {
  assert.equal(guidance("add a test for the empty-input edge case"), null);
  assert.equal(guidance("refactor the parser"), null);
});

function runHook(payload, env = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [HOOK], { stdio: ["pipe", "pipe", "pipe"], env: { ...process.env, ...env } });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.on("close", (code) => resolve({ code, out: out.trim() }));
    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}

test("e2e: weakening prompt yields additionalContext", async () => {
  const { code, out } = await runHook({ prompt: "bypass the review gate", cwd: repoRoot });
  assert.equal(code, 0);
  const r = JSON.parse(out);
  assert.match(r.additionalContext, /steering guard/i);
});

test("e2e: benign prompt yields no output", async () => {
  const { code, out } = await runHook({ prompt: "implement the feature and run the tests", cwd: repoRoot });
  assert.equal(code, 0);
  assert.equal(out, "");
});

test("e2e: weakening prompt with active goal writes steering_flagged to ledger", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "csw-steer-"));
  try {
    rt.initGoal({ objective: "g", criteriaText: "C001 | channel: cli | test: t | scenario: s" }, cwd);
    await runHook({ prompt: "skip the tests and mark it complete", cwd });
    assert.match(readFileSync(join(cwd, ".csw/ledger.jsonl"), "utf8"), /steering_flagged/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("e2e: userPrompt shape is supported and ledger snippets are redacted", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "csw-steer-"));
  const secret = "ghp_" + "A".repeat(36);
  try {
    rt.initGoal({ objective: "g", criteriaText: "C001 | channel: cli | test: t | scenario: s" }, cwd);
    const { out } = await runHook({ userPrompt: `skip the tests token=${secret}`, cwd });
    assert.match(JSON.parse(out).additionalContext, /steering guard/i);
    const ledger = readFileSync(join(cwd, ".csw/ledger.jsonl"), "utf8");
    assert.match(ledger, /steering_flagged/);
    assert.doesNotMatch(ledger, new RegExp(secret));
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("e2e: safe mode disables steering hook output", async () => {
  const { out } = await runHook({ prompt: "skip the tests", cwd: repoRoot }, { CSW_SAFE_MODE: "1" });
  assert.equal(out, "");
});

test("hooks.json registers userPromptSubmitted -> steering-guard.mjs", () => {
  const h = JSON.parse(readFileSync(join(repoRoot, "hooks/hooks.json"), "utf8"));
  assert.ok(Array.isArray(h.hooks.userPromptSubmitted), "userPromptSubmitted must be registered");
  assert.match(h.hooks.userPromptSubmitted[0].bash, /steering-guard\.mjs/);
});
