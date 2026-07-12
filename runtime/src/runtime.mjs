// High-level goal-runtime API.

import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseCriteria } from "./criteria.mjs";
import { transactState, appendLedger, hasState, loadState } from "./store.mjs";
import { evaluate } from "./oracle.mjs";
import { inspectArtifact, RECEIPT_VERSION } from "./receipts.mjs";
import { classifySteering } from "./steering.mjs";
import { sanitizeLine, verificationEnv } from "./redact.mjs";
import { fingerprintWorkspace } from "./workspace.mjs";

const NOTE_STATUSES = ["pending", "fail", "blocked"];
const DEFAULT_TIMEOUT_MS = 120_000;
const MAX_TIMEOUT_MS = 300_000;
const EXECUTION_OUTPUT_LIMIT = 1024 * 1024;
const VERIFY_RUNNER = fileURLToPath(new URL("./verify-runner.mjs", import.meta.url));

function requireState(state) {
  if (!state) throw new Error("no active goal (run `init` first)");
  return state;
}

function findCriterion(state, id) {
  const criterion = state.criteria.find((item) => item.id === id);
  if (!criterion) throw new Error(`unknown criterion "${id}"`);
  return criterion;
}

function touch(state, now) {
  state.updatedAt = now;
  return state;
}

function transactExisting(cwd, update) {
  return transactState(cwd, (state) => {
    requireState(state);
    if (state.completed) throw new Error("goal is already completed");
    const value = update(state);
    return { nextState: state, value, write: true };
  });
}

function normalizeTimeout(timeoutMs) {
  const value = timeoutMs === undefined ? DEFAULT_TIMEOUT_MS : Number(timeoutMs);
  if (!Number.isInteger(value) || value < 1 || value > MAX_TIMEOUT_MS) {
    throw new Error(`timeout-ms must be an integer from 1 to ${MAX_TIMEOUT_MS}`);
  }
  return value;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function emptyOutputMetadata() {
  const emptyHash = sha256(Buffer.alloc(0));
  return {
    limitBytes: EXECUTION_OUTPUT_LIMIT,
    limitExceeded: false,
    truncated: false,
    stdout: { bytes: 0, sha256: emptyHash },
    stderr: { bytes: 0, sha256: emptyHash },
  };
}

function executeVerification(argv, cwd, timeoutMs) {
  const runner = spawnSync(process.execPath, [VERIFY_RUNNER], {
    cwd,
    env: verificationEnv(),
    shell: false,
    input: JSON.stringify({ argv, cwd, timeoutMs, outputLimitBytes: EXECUTION_OUTPUT_LIMIT, parentPid: process.pid }),
    encoding: "utf8",
    timeout: timeoutMs + 10_000,
    killSignal: "SIGKILL",
    maxBuffer: 64 * 1024,
    windowsHide: true,
  });
  if (!runner.error && runner.status === 0) {
    try {
      const parsed = JSON.parse(runner.stdout);
      if (parsed && !parsed.runnerErrorCode) return parsed;
    } catch {}
  }
  return {
    exitCode: null,
    signal: runner.signal || null,
    timedOut: runner.error?.code === "ETIMEDOUT",
    errorCode: runner.error?.code === "ETIMEDOUT" ? "RUNNER_TIMEOUT" : "RUNNER_ERROR",
    durationMs: timeoutMs,
    output: emptyOutputMetadata(),
  };
}

/** Create (or replace) the active goal from an objective + criteria block. */
export function initGoal({ objective, criteriaText }, cwd, { now = new Date().toISOString() } = {}) {
  if (!objective || !String(objective).trim()) throw new Error("objective is required");
  const criteria = parseCriteria(criteriaText);
  const state = {
    version: 2,
    goalId: randomUUID(),
    objective: String(objective).trim(),
    criteria,
    reviewBlockers: [],
    completed: false,
    createdAt: now,
    updatedAt: now,
  };
  transactState(cwd, () => ({ nextState: state, value: state, write: true }));
  appendLedger({ kind: "goal_created", objective: state.objective, criteria: criteria.map((criterion) => criterion.id) }, cwd, { at: now });
  return state;
}

/** Read state and persist an in-memory v1 -> v2 migration under the state lock. */
export function getState(cwd) {
  return loadState(cwd);
}

export function status(cwd) {
  const state = requireState(getState(cwd));
  return evaluate(state, { cwd });
}

/**
 * Preserve the old API as a non-authoritative note. Text can record fail/blocked
 * context, but can never create a passing criterion.
 */
export function captureEvidence({ id, evidence, status: requested = "pass" }, cwd, { now = new Date().toISOString() } = {}) {
  if (requested === "pass") throw new Error("free-text evidence cannot pass a criterion; use verify or artifact");
  if (!NOTE_STATUSES.includes(requested)) throw new Error(`invalid status "${requested}"`);
  if (typeof evidence !== "string" || !evidence.trim()) throw new Error("evidence must be a nonempty string");
  const criterion = transactExisting(cwd, (state) => {
    const item = findCriterion(state, id);
    item.status = requested;
    item.revision += 1;
    item.receipt = null;
    item.notes ||= [];
    item.notes.push({ type: "note", verified: false, text: evidence.trim(), at: now });
    touch(state, now);
    return item;
  });
  appendLedger({ kind: "evidence_noted", id, status: requested }, cwd, { at: now });
  return criterion;
}

/** Execute a command outside the state lock, then commit its bounded receipt transactionally. */
export function verifyCriterion({ id, argv, timeoutMs }, cwd, { now = new Date().toISOString() } = {}) {
  if (!Array.isArray(argv) || argv.length === 0 || argv.some((arg) => typeof arg !== "string") || !argv[0].trim()) {
    throw new Error("verify requires a nonempty argv array of strings");
  }
  const timeout = normalizeTimeout(timeoutMs);
  const before = requireState(getState(cwd));
  const beforeCriterion = findCriterion(before, id);
  if (before.completed) throw new Error("goal is already completed");
  const goalId = before.goalId;
  const criterionRevision = beforeCriterion.revision;

  const result = executeVerification(argv, cwd, timeout);
  const workspace = fingerprintWorkspace(cwd);
  if (!workspace.available && workspace.reason !== "not-git" && !result.errorCode) {
    result.errorCode = "WORKSPACE_FINGERPRINT_UNAVAILABLE";
  }
  const receipt = {
    type: "verify",
    receiptVersion: RECEIPT_VERSION,
    argv0Sha256: sha256(argv[0]),
    argumentCount: argv.length - 1,
    argvSha256: sha256(JSON.stringify(argv)),
    criterionRevision,
    exitCode: result.exitCode,
    signal: result.signal || null,
    timedOut: result.timedOut,
    errorCode: result.errorCode || null,
    durationMs: result.durationMs,
    timeoutMs: timeout,
    output: result.output,
    workspace,
    at: now,
  };
  const passed = !receipt.errorCode && receipt.exitCode === 0 && !receipt.signal && !receipt.timedOut && !receipt.output.limitExceeded;

  const criterion = transactExisting(cwd, (state) => {
    if (state.goalId !== goalId) throw new Error("active goal changed while verification was running; receipt not recorded");
    const item = findCriterion(state, id);
    if (item.revision !== criterionRevision) throw new Error("criterion changed while verification was running; receipt not recorded");
    item.status = passed ? "pass" : "fail";
    item.receipt = receipt;
    item.revision += 1;
    touch(state, now);
    return item;
  });
  appendLedger({ kind: "verification_recorded", id, status: criterion.status, exitCode: receipt.exitCode, timedOut: receipt.timedOut, errorCode: receipt.errorCode }, cwd, { at: now });
  return criterion;
}

/** Validate and hash a local artifact outside the lock, then commit its receipt. */
export function captureArtifact({ id, path, summary }, cwd, { now = new Date().toISOString() } = {}) {
  if (typeof summary !== "string" || !summary.trim()) throw new Error("artifact summary is required");
  const safeSummary = sanitizeLine(summary, 500);
  if (!safeSummary) throw new Error("artifact summary is required");
  const before = requireState(getState(cwd));
  const beforeCriterion = findCriterion(before, id);
  if (before.completed) throw new Error("goal is already completed");
  const goalId = before.goalId;
  const criterionRevision = beforeCriterion.revision;
  const artifact = inspectArtifact(cwd, path);
  const receipt = { type: "artifact", receiptVersion: RECEIPT_VERSION, ...artifact, summary: safeSummary, criterionRevision, at: now };
  const criterion = transactExisting(cwd, (state) => {
    if (state.goalId !== goalId) throw new Error("active goal changed while artifact was being hashed; receipt not recorded");
    const item = findCriterion(state, id);
    if (item.revision !== criterionRevision) throw new Error("criterion changed while artifact was being hashed; receipt not recorded");
    item.status = "pass";
    item.receipt = receipt;
    item.revision += 1;
    touch(state, now);
    return item;
  });
  appendLedger({ kind: "artifact_recorded", id, path: receipt.path, size: receipt.size, sha256: receipt.sha256 }, cwd, { at: now });
  return criterion;
}

export function addBlocker({ id, reason }, cwd, { now = new Date().toISOString() } = {}) {
  if (!id || !reason) throw new Error("blocker id and reason are required");
  const blockers = transactExisting(cwd, (state) => {
    if (!state.reviewBlockers.some((blocker) => blocker.id === id)) {
      state.reviewBlockers.push({ id, reason, resolved: false, addedAt: now });
    }
    touch(state, now);
    return state.reviewBlockers;
  });
  appendLedger({ kind: "blocker_added", id, reason }, cwd, { at: now });
  return blockers;
}

export function resolveBlocker({ id }, cwd, { now = new Date().toISOString() } = {}) {
  const blocker = transactExisting(cwd, (state) => {
    const item = state.reviewBlockers.find((candidate) => candidate.id === id);
    if (!item) throw new Error(`unknown blocker "${id}"`);
    item.resolved = true;
    item.resolvedAt = now;
    touch(state, now);
    return item;
  });
  appendLedger({ kind: "blocker_resolved", id }, cwd, { at: now });
  return blocker;
}

export function steer({ text }, cwd, { now = new Date().toISOString() } = {}) {
  return transactState(cwd, (state) => {
    if (state?.completed) throw new Error("goal is already completed");
    const verdict = classifySteering(text);
    if (verdict.weakening) {
      appendLedger({ kind: "steering_rejected", verb: verdict.verb, gate: verdict.gate, text: String(text).slice(0, 200) }, cwd, { at: now });
      return { value: { accepted: false, reason: verdict.reason }, write: false };
    }
    appendLedger({ kind: "steering_accepted", text: String(text).slice(0, 200) }, cwd, { at: now });
    return { value: { accepted: true }, write: false };
  });
}

export function clearGoal(cwd, { now = new Date().toISOString() } = {}) {
  if (!hasState(cwd)) return { cleared: false, reason: "no active goal" };
  let objective;
  const cleared = transactState(cwd, (state) => {
    if (!state) return { nextState: null, value: false };
    objective = state.objective;
    return { nextState: null, value: true };
  });
  if (!cleared) return { cleared: false, reason: "no active goal" };
  appendLedger({ kind: "goal_cleared", objective }, cwd, { at: now });
  return { cleared: true };
}

export function complete(cwd, { now = new Date().toISOString() } = {}) {
  let refusal;
  try {
    const state = transactExisting(cwd, (current) => {
      if (current.completed) throw new Error("goal is already completed");
      const verdict = evaluate(current, { cwd });
      if (!verdict.done) {
        const error = new Error(`cannot complete — unmet gates:\n - ${verdict.reasons.join("\n - ")}`);
        error.reasons = verdict.reasons;
        throw error;
      }
      current.completed = true;
      current.completedAt = now;
      touch(current, now);
      return current;
    });
    appendLedger({ kind: "goal_completed" }, cwd, { at: now });
    return state;
  } catch (error) {
    if (error.reasons) {
      refusal = error.reasons;
      appendLedger({ kind: "complete_refused", reasons: refusal }, cwd, { at: now });
    }
    throw error;
  }
}

// Compatibility aliases for callers that prefer receipt-oriented names.
export const captureVerification = verifyCriterion;
export const recordArtifact = captureArtifact;
