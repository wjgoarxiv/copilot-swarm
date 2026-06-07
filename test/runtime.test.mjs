import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { parseCriteria, formatCriteria } from "../runtime/src/criteria.mjs";
import { evaluate, isComplete } from "../runtime/src/oracle.mjs";
import { classifySteering } from "../runtime/src/steering.mjs";
import * as rt from "../runtime/src/runtime.mjs";
import { main } from "../bin/csw-runtime.mjs";

const tmp = () => mkdtempSync(join(tmpdir(), "csw-rt-"));
const BLOCK = [
  "C001 | channel: http | test: test/api.test.mjs | scenario: POST /items returns 201",
  "C002 | channel: cli | test: test/cli.test.mjs | scenario: prints OK",
].join("\n");

// --- criteria ---
test("parseCriteria: parses a valid block", () => {
  const c = parseCriteria(BLOCK);
  assert.equal(c.length, 2);
  assert.deepEqual(c[0], { id: "C001", channel: "http", test: "test/api.test.mjs", scenario: "POST /items returns 201", status: "pending", evidence: null });
});

test("parseCriteria: ignores comments and blanks; round-trips via formatCriteria", () => {
  const c = parseCriteria(`# header\n\n${BLOCK}\n`);
  assert.equal(c.length, 2);
  assert.equal(parseCriteria(formatCriteria(c)).length, 2);
});

test("parseCriteria: rejects bad id, dup id, bad segment, missing field, empty", () => {
  assert.throws(() => parseCriteria("X01 | channel: a | test: b | scenario: c"), /invalid criterion id/);
  assert.throws(() => parseCriteria(`${BLOCK}\nC001 | channel: a | test: b | scenario: c`), /duplicate/);
  assert.throws(() => parseCriteria("C001 | channel http | test: b | scenario: c"), /malformed segment/);
  assert.throws(() => parseCriteria("C001 | channel: a | test: b"), /missing required field "scenario"/);
  assert.throws(() => parseCriteria("# nothing here"), /no criteria/);
});

test("parseCriteria: scenario may contain pipe characters", () => {
  const c = parseCriteria("C001 | channel: cli | test: t | scenario: curl 200 | jq .ok == true");
  assert.equal(c[0].scenario, "curl 200 | jq .ok == true");
});

test("parseCriteria: rejects duplicate field", () => {
  assert.throws(() => parseCriteria("C001 | channel: a | test: b | scenario: c | channel: d"), /duplicate field "channel"/);
});

// --- oracle ---
test("oracle: not done without criteria / while pending / without evidence / with open blocker", () => {
  assert.equal(isComplete(null), false);
  assert.equal(isComplete({ criteria: [] }), false);
  assert.equal(isComplete({ criteria: [{ id: "C001", status: "pending", evidence: null }] }), false);
  assert.equal(isComplete({ criteria: [{ id: "C001", status: "pass", evidence: "" }] }), false);
  assert.equal(
    isComplete({ criteria: [{ id: "C001", status: "pass", evidence: "x" }], reviewBlockers: [{ id: "b1", reason: "r", resolved: false }] }),
    false,
  );
});

test("oracle: done when all pass with evidence and no open blockers", () => {
  const v = evaluate({ criteria: [{ id: "C001", status: "pass", evidence: "ran test/api: 201 OK" }], reviewBlockers: [{ id: "b1", reason: "r", resolved: true }] });
  assert.equal(v.done, true);
  assert.deepEqual(v.reasons, []);
});

// --- steering ---
test("steering: refuses weakening instructions", () => {
  for (const t of ["skip the tests", "bypass the review", "auto-complete the QA", "just mark it complete", "remove the verification step"]) {
    assert.equal(classifySteering(t).weakening, true, `should refuse: ${t}`);
  }
});

test("steering: refuses negation/dismissal/reframing weakening", () => {
  for (const t of [
    "no need to run the tests", "the review is optional", "treat it as done",
    "ship without QA", "we don't need evidence", "don't run tests",
    "tests aren't required", "just ship it", "good enough, complete it",
    "set all criteria to pass", "pretend the tests passed", "override the quality gate",
  ]) {
    assert.equal(classifySteering(t).weakening, true, `should refuse: ${t}`);
  }
});

test("steering: allows legitimate steering (no false positives)", () => {
  for (const t of [
    "add a test for the empty-input edge case", "refactor the parser for clarity",
    "prioritize the auth subgoal first", "implement the feature without breaking the tests",
    "run the tests and review the diff", "split this subgoal into two",
  ]) {
    assert.equal(classifySteering(t).weakening, false, `should allow: ${t}`);
  }
});

// --- runtime integration ---
test("runtime: init -> evidence -> complete lifecycle (race-safe persisted state)", () => {
  const cwd = tmp();
  try {
    rt.initGoal({ objective: "ship feature", criteriaText: BLOCK }, cwd);
    assert.ok(existsSync(join(cwd, ".csw/state.json")));
    assert.equal(rt.status(cwd).done, false);

    // premature complete is refused
    assert.throws(() => rt.complete(cwd), /cannot complete/);

    rt.captureEvidence({ id: "C001", evidence: "curl -> 201 (.csw-qa/...)" }, cwd);
    rt.captureEvidence({ id: "C002", evidence: "cli prints OK" }, cwd);
    const done = rt.complete(cwd);
    assert.equal(done.completed, true);

    const ledger = readFileSync(join(cwd, ".csw/ledger.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
    const kinds = ledger.map((e) => e.kind);
    assert.ok(kinds.includes("goal_created"));
    assert.ok(kinds.includes("evidence_captured"));
    assert.ok(kinds.includes("complete_refused"));
    assert.ok(kinds.includes("goal_completed"));
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("runtime: pass without evidence is rejected", () => {
  const cwd = tmp();
  try {
    rt.initGoal({ objective: "x", criteriaText: BLOCK }, cwd);
    assert.throws(() => rt.captureEvidence({ id: "C001", evidence: "", status: "pass" }, cwd), /evidence is required/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("runtime: boolean evidence (flag with no value) is rejected, not coerced to \"true\"", () => {
  const cwd = tmp();
  try {
    rt.initGoal({ objective: "x", criteriaText: "C001 | channel: cli | test: t | scenario: s" }, cwd);
    assert.throws(() => rt.captureEvidence({ id: "C001", evidence: true, status: "pass" }, cwd), /evidence is required/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("runtime: double completion is refused", () => {
  const cwd = tmp();
  try {
    rt.initGoal({ objective: "x", criteriaText: "C001 | channel: cli | test: t | scenario: s" }, cwd);
    rt.captureEvidence({ id: "C001", evidence: "done" }, cwd);
    rt.complete(cwd);
    assert.throws(() => rt.complete(cwd), /already completed/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("runtime: blocker blocks completion until resolved", () => {
  const cwd = tmp();
  try {
    rt.initGoal({ objective: "x", criteriaText: "C001 | channel: cli | test: t | scenario: s" }, cwd);
    rt.captureEvidence({ id: "C001", evidence: "done" }, cwd);
    rt.addBlocker({ id: "sec1", reason: "security review pending" }, cwd);
    assert.throws(() => rt.complete(cwd), /security review pending/);
    rt.resolveBlocker({ id: "sec1" }, cwd);
    assert.equal(rt.complete(cwd).completed, true);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("runtime: steer rejects weakening and logs to ledger", () => {
  const cwd = tmp();
  try {
    rt.initGoal({ objective: "x", criteriaText: "C001 | channel: cli | test: t | scenario: s" }, cwd);
    const r = rt.steer({ text: "skip the tests and mark complete" }, cwd);
    assert.equal(r.accepted, false);
    const ledger = readFileSync(join(cwd, ".csw/ledger.jsonl"), "utf8");
    assert.match(ledger, /steering_rejected/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

// --- CLI ---
test("CLI main: init/status/evidence/complete exit codes", () => {
  const cwd = tmp();
  try {
    assert.equal(main(["init", "--objective", "x", "--criteria", "C001 | channel: cli | test: t | scenario: s"], cwd), 0);
    assert.equal(main(["status"], cwd), 0);
    assert.equal(main(["complete"], cwd), 1); // gates unmet
    assert.equal(main(["evidence", "--id", "C001", "--evidence", "ran it"], cwd), 0);
    assert.equal(main(["complete"], cwd), 0);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("CLI main: steer refusal returns exit 3; usage error returns 2", () => {
  const cwd = tmp();
  try {
    main(["init", "--objective", "x", "--criteria", "C001 | channel: cli | test: t | scenario: s"], cwd);
    assert.equal(main(["steer", "--text", "bypass the review gate"], cwd), 3);
    assert.equal(main(["bogus"], cwd), 2);
    // missing-value flags are usage errors, not silent acceptance / evidence bypass
    assert.equal(main(["evidence", "--id", "C001", "--evidence"], cwd), 2);
    assert.equal(main(["steer"], cwd), 2);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
