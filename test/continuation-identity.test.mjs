import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as continuation from "../hooks/continuation.mjs";
import * as rt from "../runtime/src/runtime.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const HOOK = join(repoRoot, "hooks/continuation.mjs");
const tmp = () => mkdtempSync(join(tmpdir(), "csw-stop-identity-"));

function rootPayload(cwd, overrides = {}) {
  const sessionId = "root-session";
  return {
    cwd,
    sessionId,
    transcriptPath: join(cwd, ".copilot", sessionId, "transcript.jsonl"),
    ...overrides,
  };
}

function runHook(input, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [HOOK], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, ...env },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
    child.stdin.end(typeof input === "string" ? input : JSON.stringify(input));
  });
}

function stateHash(cwd) {
  return createHash("sha256")
    .update(readFileSync(join(cwd, ".csw", "state.json")))
    .digest("hex");
}

test("root stop identity is structural and rejects worker or malformed shapes", () => {
  assert.equal(typeof continuation.isRootStopPayload, "function");
  const cwd = "/tmp/csw-root-shape";
  assert.equal(continuation.isRootStopPayload(rootPayload(cwd)), true);
  assert.equal(continuation.isRootStopPayload(rootPayload(cwd, { sessionId: "call_worker" })), false);
  assert.equal(continuation.isRootStopPayload(rootPayload(cwd, { transcriptPath: "" })), false);
  assert.equal(continuation.isRootStopPayload(rootPayload(cwd, {
    transcriptPath: join(cwd, ".copilot", "different-session", "transcript.jsonl"),
  })), false);
  assert.equal(continuation.isRootStopPayload({ cwd }), false);
  assert.equal(continuation.isRootStopPayload([]), false);
  assert.equal(continuation.isRootStopPayload(null), false);
});

test("pending valid root stops block repeatedly without mutating goal state", async () => {
  const cwd = tmp();
  try {
    rt.initGoal({ objective: "root", criteriaText: "C001 | channel: cli | test: t | scenario: s" }, cwd);
    const before = stateHash(cwd);
    for (let i = 0; i < 2; i += 1) {
      const result = await runHook(rootPayload(cwd));
      assert.equal(result.code, 0);
      assert.equal(result.stderr, "");
      const decision = JSON.parse(result.stdout);
      assert.equal(decision.decision, "block");
      assert.match(decision.reason, /C001/);
    }
    assert.equal(stateHash(cwd), before);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("pending worker-shaped stops fail open repeatedly without mutating goal state", async () => {
  const cwd = tmp();
  try {
    rt.initGoal({ objective: "worker", criteriaText: "C001 | channel: cli | test: t | scenario: s" }, cwd);
    const before = stateHash(cwd);
    const worker = rootPayload(cwd, { sessionId: "call_worker", transcriptPath: "" });
    for (let i = 0; i < 2; i += 1) {
      const result = await runHook(worker);
      assert.equal(result.code, 0);
      assert.equal(result.stdout, "");
      assert.equal(result.stderr, "");
    }
    assert.equal(stateHash(cwd), before);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("unknown stop identities and invalid JSON fail open", async () => {
  const cwd = tmp();
  try {
    rt.initGoal({ objective: "unknown", criteriaText: "C001 | channel: cli | test: t | scenario: s" }, cwd);
    const cases = [
      { cwd },
      rootPayload(cwd, { sessionId: 42 }),
      rootPayload(cwd, { transcriptPath: 42 }),
      rootPayload(cwd, { transcriptPath: join(cwd, "other", "transcript.jsonl") }),
    ];
    for (const payload of cases) {
      const result = await runHook(payload);
      assert.equal(result.code, 0);
      assert.equal(result.stdout, "");
      assert.equal(result.stderr, "");
    }
    const invalid = await runHook("{not-json");
    assert.equal(invalid.code, 0);
    assert.equal(invalid.stdout, "");
    assert.equal(invalid.stderr, "");
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("completed valid root stop is silent", async () => {
  const cwd = tmp();
  try {
    rt.initGoal({ objective: "complete", criteriaText: "C001 | channel: cli | test: t | scenario: s" }, cwd);
    rt.verifyCriterion({ id: "C001", argv: [process.execPath, "-e", "process.exit(0)"] }, cwd);
    rt.complete(cwd);
    const result = await runHook(rootPayload(cwd));
    assert.equal(result.code, 0);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr, "");
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
