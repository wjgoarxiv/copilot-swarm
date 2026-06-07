import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { decide } from "../hooks/continuation.mjs";
import * as rt from "../runtime/src/runtime.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const HOOK = join(repoRoot, "hooks/continuation.mjs");
const tmp = () => mkdtempSync(join(tmpdir(), "csw-hook-"));

// --- decide() pure logic ---
test("decide: no goal -> no block", () => {
  assert.equal(decide(null).block, false);
});
test("decide: completed goal -> no block", () => {
  assert.equal(decide({ completed: true, criteria: [] }).block, false);
});
test("decide: incomplete goal -> block with reason", () => {
  const d = decide({ objective: "g", completed: false, criteria: [{ id: "C001", status: "pending", evidence: null }] });
  assert.equal(d.block, true);
  assert.match(d.reason, /not complete/);
  assert.match(d.reason, /C001/);
});
test("decide: all criteria pass with evidence, no blockers -> no block", () => {
  assert.equal(decide({ objective: "g", completed: false, criteria: [{ id: "C001", status: "pass", evidence: "x" }], reviewBlockers: [] }).block, false);
});

test("decide: empty/invalid criteria never blocks (no livelock)", () => {
  assert.equal(decide({ objective: "g", completed: false, criteria: [] }).block, false);
  assert.equal(decide({ objective: "g", completed: false }).block, false); // missing criteria
  assert.equal(decide({ objective: "g", completed: false, criteria: "oops" }).block, false);
});

// --- e2e: hook process reads payload + state, emits decision ---
function runHook(payload) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [HOOK], { stdio: ["pipe", "pipe", "pipe"] });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.on("close", (code) => resolve({ code, out: out.trim() }));
    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}

test("e2e: blocks while an active goal is incomplete", async () => {
  const cwd = tmp();
  try {
    rt.initGoal({ objective: "demo", criteriaText: "C001 | channel: cli | test: t | scenario: s" }, cwd);
    const { code, out } = await runHook({ cwd });
    assert.equal(code, 0);
    const decision = JSON.parse(out);
    assert.equal(decision.decision, "block");
    assert.match(decision.reason, /C001/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("e2e: does not block once the goal is complete", async () => {
  const cwd = tmp();
  try {
    rt.initGoal({ objective: "demo", criteriaText: "C001 | channel: cli | test: t | scenario: s" }, cwd);
    rt.captureEvidence({ id: "C001", evidence: "done" }, cwd);
    rt.complete(cwd);
    const { code, out } = await runHook({ cwd });
    assert.equal(code, 0);
    assert.equal(out, ""); // no block emitted
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("e2e: clearing an incomplete goal releases the block", async () => {
  const cwd = tmp();
  try {
    rt.initGoal({ objective: "demo", criteriaText: "C001 | channel: cli | test: t | scenario: s" }, cwd);
    assert.equal(JSON.parse((await runHook({ cwd })).out).decision, "block");
    const r = rt.clearGoal(cwd);
    assert.equal(r.cleared, true);
    const { out } = await runHook({ cwd });
    assert.equal(out, ""); // no goal => no block
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("e2e: no goal -> never blocks (opt-in)", async () => {
  const cwd = tmp();
  try {
    const { code, out } = await runHook({ cwd });
    assert.equal(code, 0);
    assert.equal(out, "");
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

// --- hooks.json registration ---
test("hooks.json registers agentStop + subagentStop pointing at continuation.mjs", () => {
  const h = JSON.parse(readFileSync(join(repoRoot, "hooks/hooks.json"), "utf8"));
  for (const ev of ["agentStop", "subagentStop"]) {
    assert.ok(Array.isArray(h.hooks[ev]) && h.hooks[ev].length === 1, `${ev} must be registered`);
    assert.match(h.hooks[ev][0].bash, /continuation\.mjs/);
  }
});
