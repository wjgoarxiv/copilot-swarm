import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { decide } from "../hooks/continuation.mjs";
import { classifySteering } from "../runtime/src/steering.mjs";
import * as rt from "../runtime/src/runtime.mjs";
import { parseCriteria } from "../runtime/src/criteria.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const HOOK = join(repoRoot, "hooks/continuation.mjs");
const tmp = () => mkdtempSync(join(tmpdir(), "csw-hook-"));
const SECRET = "github_pat_" + "A".repeat(32);
const NOW = "2026-07-12T00:00:00.000Z";
const HASH = "a".repeat(64);
const verifyReceipt = () => ({
  type: "verify",
  receiptVersion: 1,
  argv0Sha256: HASH,
  argumentCount: 0,
  argvSha256: HASH,
  criterionRevision: 0,
  exitCode: 0,
  signal: null,
  timedOut: false,
  errorCode: null,
  durationMs: 1,
  timeoutMs: 1000,
  output: {
    limitBytes: 1024,
    limitExceeded: false,
    truncated: false,
    stdout: { bytes: 0, sha256: HASH },
    stderr: { bytes: 0, sha256: HASH },
  },
  workspace: { version: 1, available: false, reason: "not-git" },
  at: NOW,
});
const activeState = (overrides = {}) => ({
  version: 2,
  goalId: "goal-test",
  objective: "g",
  completed: false,
  createdAt: NOW,
  updatedAt: NOW,
  criteria: [{ id: "C001", channel: "cli", test: "test", scenario: "scenario", status: "pending", revision: 0, receipt: null, notes: [] }],
  reviewBlockers: [],
  ...overrides,
});
const decideFresh = (state, opts = {}) => decide(state, { now: Date.parse(NOW), ...opts });

// --- decide() pure logic ---
test("decide: no goal -> no block", () => {
  assert.equal(decide(null).block, false);
});
test("decide: completed goal -> no block", () => {
  assert.equal(decide({ completed: true, criteria: [] }).block, false);
});
test("decide: incomplete goal -> block with reason", () => {
  const d = decideFresh(activeState());
  assert.equal(d.block, true);
  assert.match(d.reason, /not complete/);
  assert.match(d.reason, /C001/);
  assert.match(d.reason, /exact runtime invocation supplied at session start/);
  assert.match(d.reason, /verify --id <C0NN> -- <argv\.\.\.>/);
  assert.match(d.reason, /artifact --id <C0NN> --path <workspace-file> --summary <observed-outcome>/);
});
test("runtime parser and continuation agree on canonical C0NN ids", () => {
  assert.throws(
    () => parseCriteria("C01 | channel: cli | test: test | scenario: scenario"),
    /invalid criterion id/,
  );
  const [criterion] = parseCriteria("C001 | channel: cli | test: test | scenario: scenario");
  assert.equal(decideFresh(activeState({ criteria: [criterion] })).block, true);
});
test("decide: all criteria pass with machine receipts, no blockers -> no block", () => {
  assert.equal(decideFresh(activeState({ criteria: [{ id: "C001", channel: "cli", test: "test", scenario: "scenario", status: "pass", revision: 1, receipt: verifyReceipt(), notes: [] }] })).block, false);
});

test("decide: empty/invalid criteria never blocks (no livelock)", () => {
  assert.equal(decide({ objective: "g", completed: false, criteria: [] }).block, false);
  assert.equal(decide({ objective: "g", completed: false }).block, false); // missing criteria
  assert.equal(decide({ objective: "g", completed: false, criteria: "oops" }).block, false);
});

test("decide: safe mode and stale states fail open", () => {
  const state = activeState({ createdAt: "2000-01-01T00:00:00.000Z", updatedAt: "2000-01-01T00:00:00.000Z" });
  assert.equal(decide(state, { safeMode: true }).block, false);
  assert.equal(decide(state, { now: Date.parse("2026-01-01T00:00:00.000Z") }).block, false);
});

test("decide: redacts secret-like objective and blocker reasons", () => {
  const d = decideFresh({
    ...activeState(),
    objective: `leak ${SECRET}`,
    reviewBlockers: [{ id: "b1", reason: `token=${SECRET}`, resolved: false, addedAt: NOW }],
  });
  assert.equal(d.block, true);
  assert.doesNotMatch(d.reason, new RegExp(SECRET));
  assert.match(d.reason, /REDACTED/);
});

// --- e2e: hook process reads payload + state, emits decision ---
function runHook(payload) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [HOOK], { stdio: ["pipe", "pipe", "pipe"] });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.on("close", (code) => resolve({ code, out: out.trim() }));
    const sessionId = "root-session";
    child.stdin.write(JSON.stringify({
      sessionId,
      transcriptPath: join(payload.cwd, ".copilot", sessionId, "transcript.jsonl"),
      ...payload,
    }));
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
    assert.match(decision.reason, /exact runtime invocation supplied at session start/);
    assert.match(decision.reason, /verify --id <C0NN> -- <argv\.\.\.>/);
    assert.match(decision.reason, /artifact --id <C0NN> --path <workspace-file> --summary <observed-outcome>/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("e2e: does not block once the goal is complete", async () => {
  const cwd = tmp();
  try {
    rt.initGoal({ objective: "demo", criteriaText: "C001 | channel: cli | test: t | scenario: s" }, cwd);
    rt.verifyCriterion({ id: "C001", argv: [process.execPath, "-e", "process.exit(0)"] }, cwd);
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

test("e2e: malformed state and safe mode fail open", async () => {
  const cwd = tmp();
  try {
    mkdirSync(join(cwd, ".csw"), { recursive: true });
    writeFileSync(join(cwd, ".csw/state.json"), "{not-json");
    assert.equal((await runHook({ cwd })).out, "");

    rmSync(join(cwd, ".csw"), { recursive: true, force: true });
    rt.initGoal({ objective: "demo", criteriaText: "C001 | channel: cli | test: t | scenario: s" }, cwd);
    const child = spawn(process.execPath, [HOOK], { stdio: ["pipe", "pipe", "pipe"], env: { ...process.env, CSW_SAFE_MODE: "1" } });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stdin.write(JSON.stringify({ cwd }));
    child.stdin.end();
    const code = await new Promise((resolve) => child.on("close", resolve));
    assert.equal(code, 0);
    assert.equal(out.trim(), "");
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("e2e: every parseable malformed state exits zero without blocking", async () => {
  const cases = [
    ["missing timestamp", activeState({ updatedAt: undefined })],
    ["invalid timestamp", activeState({ createdAt: "not-a-date" })],
    ["null criteria", activeState({ criteria: null })],
    ["malformed criterion", activeState({ criteria: [null] })],
    ["malformed blockers", activeState({ reviewBlockers: {} })],
    ["malformed receipt", activeState({ criteria: [{ id: "C001", channel: "cli", test: "test", scenario: "scenario", status: "pass", receipt: { type: "artifact", path: null }, notes: [] }] })],
  ];
  for (const [label, state] of cases) {
    const cwd = tmp();
    try {
      mkdirSync(join(cwd, ".csw"), { recursive: true });
      writeFileSync(join(cwd, ".csw/state.json"), JSON.stringify(state));
      const result = await runHook({ cwd });
      assert.equal(result.code, 0, label);
      assert.equal(result.out, "", label);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  }
});

// --- hooks.json registration ---
test("hooks.json gates only root agentStop with continuation.mjs", () => {
  const h = JSON.parse(readFileSync(join(repoRoot, "hooks/hooks.json"), "utf8"));
  assert.ok(Array.isArray(h.hooks.agentStop) && h.hooks.agentStop.length === 1, "agentStop must be registered");
  assert.match(h.hooks.agentStop[0].bash, /continuation\.mjs/);
  assert.equal(h.hooks.subagentStop, undefined, "subagents must be allowed to stop independently");
});

test("decide: block reason directs delegation without reading as gate weakening", () => {
  const d = decideFresh(activeState());
  assert.match(d.reason, /delegate/i);
  assert.match(d.reason, /`task`/);
  assert.equal(classifySteering(d.reason).weakening, false);
});
