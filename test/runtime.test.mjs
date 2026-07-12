import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { parseCriteria, formatCriteria } from "../runtime/src/criteria.mjs";
import { evaluate, isComplete } from "../runtime/src/oracle.mjs";
import { classifySteering } from "../runtime/src/steering.mjs";
import * as rt from "../runtime/src/runtime.mjs";
import { main } from "../bin/csw-runtime.mjs";

const SECRET = "ghp_" + "A".repeat(36);

const tmp = () => mkdtempSync(join(tmpdir(), "csw-rt-"));
const BLOCK = [
  "C001 | channel: http | test: test/api.test.mjs | scenario: POST /items returns 201",
  "C002 | channel: cli | test: test/cli.test.mjs | scenario: prints OK",
].join("\n");

// --- criteria ---
test("parseCriteria: parses a valid block", () => {
  const c = parseCriteria(BLOCK);
  assert.equal(c.length, 2);
  assert.deepEqual(c[0], { id: "C001", channel: "http", test: "test/api.test.mjs", scenario: "POST /items returns 201", status: "pending", revision: 0, receipt: null, notes: [] });
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
  assert.equal(isComplete({ criteria: [{ id: "C001", status: "pending", receipt: null }] }), false);
  assert.equal(isComplete({ criteria: [{ id: "C001", status: "pass", receipt: null }] }), false);
  assert.equal(
    isComplete({ criteria: [{ id: "C001", status: "pass", revision: 1, receipt: validVerifyReceipt() }], reviewBlockers: [{ id: "b1", reason: "r", resolved: false }] }),
    false,
  );
});

test("oracle: done only with a successful machine receipt and no open blockers", () => {
  const v = evaluate({ version: 2, criteria: [{ id: "C001", status: "pass", revision: 1, receipt: validVerifyReceipt() }], reviewBlockers: [{ id: "b1", reason: "r", resolved: true }] });
  assert.equal(v.done, true);
  assert.deepEqual(v.reasons, []);
});

function validVerifyReceipt() {
  const emptyHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
  return {
    type: "verify",
    receiptVersion: 1,
    argv0Sha256: emptyHash,
    argumentCount: 0,
    argvSha256: emptyHash,
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
      stdout: { bytes: 0, sha256: emptyHash },
      stderr: { bytes: 0, sha256: emptyHash },
    },
    workspace: { version: 1, available: false, reason: "not-git" },
    at: "2026-01-01T00:00:00.000Z",
  };
}

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
test("runtime: init -> verified receipts -> complete lifecycle", () => {
  const cwd = tmp();
  try {
    rt.initGoal({ objective: "ship feature", criteriaText: BLOCK }, cwd);
    assert.ok(existsSync(join(cwd, ".csw/state.json")));
    assert.equal(rt.status(cwd).done, false);

    // premature complete is refused
    assert.throws(() => rt.complete(cwd), /cannot complete/);

    rt.verifyCriterion({ id: "C001", argv: [process.execPath, "-e", "process.exit(0)"] }, cwd);
    rt.verifyCriterion({ id: "C002", argv: [process.execPath, "-e", "process.exit(0)"] }, cwd);
    const done = rt.complete(cwd);
    assert.equal(done.completed, true);

    const ledger = readFileSync(join(cwd, ".csw/ledger.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
    const kinds = ledger.map((e) => e.kind);
    assert.ok(kinds.includes("goal_created"));
    assert.ok(kinds.includes("verification_recorded"));
    assert.ok(kinds.includes("complete_refused"));
    assert.ok(kinds.includes("goal_completed"));
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("runtime: free-text evidence cannot pass a criterion", () => {
  const cwd = tmp();
  try {
    rt.initGoal({ objective: "x", criteriaText: BLOCK }, cwd);
    assert.throws(() => rt.captureEvidence({ id: "C001", evidence: "claimed pass", status: "pass" }, cwd), /free-text evidence cannot pass/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("runtime: boolean evidence is rejected, not coerced to \"true\"", () => {
  const cwd = tmp();
  try {
    rt.initGoal({ objective: "x", criteriaText: "C001 | channel: cli | test: t | scenario: s" }, cwd);
    assert.throws(() => rt.captureEvidence({ id: "C001", evidence: true, status: "pending" }, cwd), /evidence must be a nonempty string/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("runtime: double completion is refused", () => {
  const cwd = tmp();
  try {
    rt.initGoal({ objective: "x", criteriaText: "C001 | channel: cli | test: t | scenario: s" }, cwd);
    rt.verifyCriterion({ id: "C001", argv: [process.execPath, "-e", "process.exit(0)"] }, cwd);
    rt.complete(cwd);
    assert.throws(() => rt.complete(cwd), /already completed/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("runtime: completed goals reject note, blocker, resolve, and steer mutations", () => {
  const cwd = tmp();
  try {
    rt.initGoal({ objective: "x", criteriaText: "C001 | channel: cli | test: t | scenario: s" }, cwd);
    rt.addBlocker({ id: "review", reason: "temporary" }, cwd);
    rt.resolveBlocker({ id: "review" }, cwd);
    rt.verifyCriterion({ id: "C001", argv: [process.execPath, "-e", "process.exit(0)"] }, cwd);
    rt.complete(cwd);
    const stateBefore = readFileSync(join(cwd, ".csw/state.json"), "utf8");
    const ledgerBefore = readFileSync(join(cwd, ".csw/ledger.jsonl"), "utf8");
    assert.throws(() => rt.captureEvidence({ id: "C001", evidence: "late", status: "pending" }, cwd), /already completed/);
    assert.throws(() => rt.addBlocker({ id: "late", reason: "late" }, cwd), /already completed/);
    assert.throws(() => rt.resolveBlocker({ id: "review" }, cwd), /already completed/);
    assert.throws(() => rt.steer({ text: "add another test" }, cwd), /already completed/);
    assert.throws(() => rt.verifyCriterion({ id: "C001", argv: [process.execPath, "-e", "process.exit(0)"] }, cwd), /already completed/);
    assert.throws(() => rt.captureArtifact({ id: "C001", path: "missing", summary: "late" }, cwd), /already completed/);
    assert.equal(readFileSync(join(cwd, ".csw/state.json"), "utf8"), stateBefore);
    assert.equal(readFileSync(join(cwd, ".csw/ledger.jsonl"), "utf8"), ledgerBefore);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("runtime: blocker blocks completion until resolved", () => {
  const cwd = tmp();
  try {
    rt.initGoal({ objective: "x", criteriaText: "C001 | channel: cli | test: t | scenario: s" }, cwd);
    rt.verifyCriterion({ id: "C001", argv: [process.execPath, "-e", "process.exit(0)"] }, cwd);
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

test("runtime: clearGoal removes state and logs goal_cleared", () => {
  const cwd = tmp();
  try {
    rt.initGoal({ objective: "x", criteriaText: "C001 | channel: cli | test: t | scenario: s" }, cwd);
    assert.equal(rt.clearGoal(cwd).cleared, true);
    assert.equal(rt.getState(cwd), null);
    assert.match(readFileSync(join(cwd, ".csw/ledger.jsonl"), "utf8"), /goal_cleared/);
    assert.equal(rt.clearGoal(cwd).cleared, false); // nothing to clear
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("runtime: redacts secret-like objective, notes, blockers, and steering text", () => {
  const cwd = tmp();
  try {
    rt.initGoal({ objective: `ship with ${SECRET}`, criteriaText: "C001 | channel: cli | test: t | scenario: s" }, cwd);
    rt.captureEvidence({ id: "C001", evidence: `Bearer ${"B".repeat(24)}`, status: "pending" }, cwd);
    rt.addBlocker({ id: "b1", reason: `password=${"p".repeat(10)}` }, cwd);
    rt.steer({ text: `skip tests token=${SECRET}` }, cwd);
    const state = readFileSync(join(cwd, ".csw/state.json"), "utf8");
    const ledger = readFileSync(join(cwd, ".csw/ledger.jsonl"), "utf8");
    assert.doesNotMatch(state, new RegExp(SECRET));
    assert.doesNotMatch(ledger, new RegExp(SECRET));
    assert.match(state, /REDACTED/);
    assert.match(ledger, /REDACTED/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("runtime: state and ledger are private on POSIX", () => {
  const cwd = tmp();
  try {
    rt.initGoal({ objective: "x", criteriaText: "C001 | channel: cli | test: t | scenario: s" }, cwd);
    const mode = (p) => statSync(p).mode & 0o777;
    assert.equal(mode(join(cwd, ".csw")), 0o700);
    assert.equal(mode(join(cwd, ".csw/state.json")), 0o600);
    assert.equal(mode(join(cwd, ".csw/ledger.jsonl")), 0o600);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("runtime: getState and CLI show do not create .csw when no state exists", () => {
  const cwd = tmp();
  try {
    assert.equal(rt.getState(cwd), null);
    assert.equal(existsSync(join(cwd, ".csw")), false);
    assert.equal(main(["show"], cwd), 0);
    assert.equal(existsSync(join(cwd, ".csw")), false);
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
    assert.equal(main(["evidence", "--id", "C001", "--evidence", "ran it"], cwd), 1);
    assert.equal(main(["verify", "--id", "C001", "--", process.execPath, "-e", "process.exit(0)"], cwd), 0);
    assert.equal(main(["complete"], cwd), 0);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("runtime: reading v1 state durably migrates evidence to an unverified legacy note", () => {
  const cwd = tmp();
  try {
    rt.initGoal({ objective: "x", criteriaText: "C001 | channel: cli | test: t | scenario: s" }, cwd);
    const path = join(cwd, ".csw/state.json");
    const old = JSON.parse(readFileSync(path, "utf8"));
    old.version = 1;
    old.criteria[0] = { ...old.criteria[0], status: "pass", evidence: "manual claim" };
    delete old.criteria[0].receipt;
    delete old.criteria[0].notes;
    writeFileSync(path, JSON.stringify(old));

    const migrated = rt.getState(cwd);
    assert.equal(migrated.version, 2);
    assert.equal(migrated.criteria[0].status, "pending");
    assert.equal(migrated.criteria[0].receipt, null);
    assert.deepEqual(migrated.criteria[0].notes, [{ type: "legacy", verified: false, text: "manual claim" }]);
    assert.equal(JSON.parse(readFileSync(path, "utf8")).version, 2);
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
    assert.equal(main(["blocker", "add", "--id", "b1", "--reason"], cwd), 2);
    assert.equal(main(["blocker", "resolve", "--id"], cwd), 2);
    assert.equal(main(["steer"], cwd), 2);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
