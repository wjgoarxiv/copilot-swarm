import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { classifySteering } from "../runtime/src/steering.mjs";
import * as runtime from "../runtime/src/runtime.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const steeringHook = join(repoRoot, "hooks/steering-guard.mjs");
const continuationHook = join(repoRoot, "hooks/continuation.mjs");

const protective = [
  "Do not weaken, skip, or auto-complete any success criterion.",
  "Do not weaken, skip or auto-complete any success criterion!",
  "Do not stop until the completion oracle passes.",
  "Do not stop until every completion criterion passes.",
  "Do not skip tests.",
  "Never skip tests.",
  "Do not forget to run tests.",
  "Implement without breaking the tests.",
  "Initialize one criterion. Remove the registered writer worktree after integration and stop immediately after completion.",
  "Initialize one criterion for result.txt. Remove the temporary run logs after integration.",
  "After QA, remove the temporary logs and review the final evidence.",
  "Archive unit and integration test reports.",
  "Review manual and automated QA evidence.",
  "Remove temporary logs and review final evidence.",
  "After testing, remove temporary logs.",
  "Before review, remove duplicate notes from the report.",
  "Once QA passes, omit the temporary diagnostics bundle.",
  "When verification finishes, disable the debug logger.",
  "After QA, bypass the stale cache and review evidence.",
  "Tests should not be skipped.",
  "Remove temporary logs and archive test reports.",
  "Remove temporary logs and preserve review evidence.",
];

const weakening = [
  "Do not run tests.",
  "No need to run tests.",
  "Tests are optional.",
  "Auto-complete it.",
  "Ignore review.",
  "Do not skip tests, but ignore review.",
  "Do not auto-complete criteria; tests are optional.",
  "Do not skip tests if possible.",
  "Never skip tests unless they take too long.",
  "Do not stop until the completion oracle passes, unless it is inconvenient.",
  "Do not forget to run tests when convenient.",
  "Do not weaken, skip, or auto-complete any success criterion unless delivery is urgent.",
  "Initialize one criterion. Remove the registered writer worktree after integration and stop immediately after completion, but tests are optional.",
  "Initialize one criterion for result.txt. Remove the temporary run logs after integration, but tests are optional.",
  "Skip unit and integration tests.",
  "No need to run unit and integration tests.",
  "Ignore manual and automated review.",
  "After QA, remove the temporary logs and review the final evidence, but tests are optional.",
  "Bypass smoke or regression tests.",
  "Omit manual and security verification.",
  "No need to run exploratory or automated QA.",
  "Run unit tests and ignore review.",
  "Ignore review and skip tests.",
  "Remove temporary logs and ignore final review.",
  "After cleanup, skip QA and remove logs.",
  "After cleanup, remove logs and then skip review.",
  "After deployment, skip smoke and regression tests.",
  "Tests should be skipped.",
  "Testing can be bypassed.",
  "Review should be optional.",
  "Skipping tests is fine.",
  "Tests should not be skipped unless delivery is urgent.",
  "Review should not be optional unless delivery is urgent.",
];

function runHook(hook, payload) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [hook], {
      stdio: ["pipe", "pipe", "pipe"],
      env: process.env,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout: stdout.trim(), stderr: stderr.trim() }));
    child.stdin.end(JSON.stringify(payload));
  });
}

function ledgerEvents(cwd, kind) {
  return readFileSync(join(cwd, ".csw", "ledger.jsonl"), "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .filter((event) => event.kind === kind);
}

test("protective instructions are not classified as gate weakening", () => {
  for (const prompt of protective) {
    assert.deepEqual(classifySteering(prompt), { weakening: false }, prompt);
  }
});

test("real weakening and mixed protective/weakening clauses remain rejected", () => {
  for (const prompt of weakening) {
    assert.equal(classifySteering(prompt).weakening, true, prompt);
  }
});

test("coordinated predicates are attributed to the actual weakening verb", () => {
  const result = classifySteering("After cleanup, remove logs and then skip review.");
  assert.equal(result.weakening, true);
  assert.match(result.verb, /skip/i);
  assert.match(result.gate, /review/i);
});

test("protective hook prompts stay silent and do not append steering events", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "csw-polarity-allow-"));
  try {
    runtime.initGoal({ objective: "polarity allow", criteriaText: "C001 | channel: cli | test: t | scenario: s" }, cwd);
    const before = ledgerEvents(cwd, "steering_flagged").length;
    for (const prompt of protective) {
      const result = await runHook(steeringHook, { prompt, cwd });
      assert.equal(result.code, 0, prompt);
      assert.equal(result.stdout, "", prompt);
    }
    assert.equal(ledgerEvents(cwd, "steering_flagged").length, before);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("each weakening hook prompt emits refusal and exactly one redacted event", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "csw-polarity-reject-"));
  try {
    runtime.initGoal({ objective: "polarity reject", criteriaText: "C001 | channel: cli | test: t | scenario: s" }, cwd);
    for (const [index, basePrompt] of weakening.entries()) {
      const secret = `ghp_${String(index).padStart(36, "A")}`;
      const prompt = `${basePrompt} token=${secret}`;
      const before = ledgerEvents(cwd, "steering_flagged").length;
      const result = await runHook(steeringHook, { prompt, cwd });
      assert.equal(result.code, 0, basePrompt);
      assert.match(JSON.parse(result.stdout).additionalContext, /steering guard/i, basePrompt);
      const events = ledgerEvents(cwd, "steering_flagged");
      assert.equal(events.length, before + 1, basePrompt);
      assert.doesNotMatch(JSON.stringify(events.at(-1)), new RegExp(secret), basePrompt);
    }
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("the actual pending continuation reason is accepted by the steering hook", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "csw-hook-chain-"));
  const sessionId = "root-session";
  const transcriptPath = join(cwd, ".copilot", sessionId, "transcript.jsonl");
  try {
    mkdirSync(dirname(transcriptPath), { recursive: true });
    runtime.initGoal({ objective: "hook chain", criteriaText: "C001 | channel: cli | test: t | scenario: s" }, cwd);
    const continuation = await runHook(continuationHook, { cwd, sessionId, transcriptPath });
    assert.equal(continuation.code, 0);
    const payload = JSON.parse(continuation.stdout);
    assert.equal(payload.decision, "block");
    assert.equal(typeof payload.reason, "string");
    assert.ok(payload.reason.length > 0);

    const before = ledgerEvents(cwd, "steering_flagged").length;
    const steering = await runHook(steeringHook, { cwd, prompt: payload.reason });
    assert.equal(steering.code, 0);
    assert.equal(steering.stdout, "");
    assert.equal(ledgerEvents(cwd, "steering_flagged").length, before);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("steering_flagged ledger events name the matched verb and gate", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "csw-polarity-diag-"));
  try {
    runtime.initGoal({ objective: "polarity diag", criteriaText: "C001 | channel: cli | test: t | scenario: s" }, cwd);
    const result = await runHook(steeringHook, { prompt: weakening[0], cwd });
    assert.equal(result.code, 0);
    const event = ledgerEvents(cwd, "steering_flagged").at(-1);
    assert.ok(typeof event.verb === "string" && event.verb.length > 0, JSON.stringify(event));
    assert.ok(typeof event.gate === "string" && event.gate.length > 0, JSON.stringify(event));
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
