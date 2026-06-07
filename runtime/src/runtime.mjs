// High-level goal-runtime API. Wraps the store, criteria parser, completion
// oracle, and steering guard into the operations the CLI / hooks call.

import { parseCriteria } from "./criteria.mjs";
import { loadState, saveState, appendLedger } from "./store.mjs";
import { evaluate } from "./oracle.mjs";
import { classifySteering } from "./steering.mjs";

const STATUSES = ["pending", "pass", "fail", "blocked"];

function requireState(cwd) {
  const s = loadState(cwd);
  if (!s) throw new Error("no active goal (run `init` first)");
  return s;
}
function findCriterion(state, id) {
  const c = state.criteria.find((x) => x.id === id);
  if (!c) throw new Error(`unknown criterion "${id}"`);
  return c;
}
function touch(state, now) {
  state.updatedAt = now;
  return state;
}

/** Create (or replace) the active goal from an objective + criteria block. */
export function initGoal({ objective, criteriaText }, cwd, { now = new Date().toISOString() } = {}) {
  if (!objective || !String(objective).trim()) throw new Error("objective is required");
  const criteria = parseCriteria(criteriaText);
  const state = { version: 1, objective: String(objective).trim(), criteria, reviewBlockers: [], completed: false, createdAt: now, updatedAt: now };
  saveState(state, cwd);
  appendLedger({ kind: "goal_created", objective: state.objective, criteria: criteria.map((c) => c.id) }, cwd, { at: now });
  return state;
}

export function getState(cwd) {
  return loadState(cwd);
}

export function status(cwd) {
  return evaluate(requireState(cwd));
}

/** Record evidence for a criterion and set its status (default "pass"). */
export function captureEvidence({ id, evidence, status: st = "pass" }, cwd, { now = new Date().toISOString() } = {}) {
  if (!STATUSES.includes(st)) throw new Error(`invalid status "${st}"`);
  // Evidence must be a real string — guard against a boolean flag (e.g. `--evidence`
  // with no value) being coerced into the truthy string "true".
  const ev = typeof evidence === "string" ? evidence : null;
  if (st === "pass" && (!ev || !ev.trim())) throw new Error("evidence is required to pass a criterion");
  const state = requireState(cwd);
  const c = findCriterion(state, id);
  c.status = st;
  c.evidence = ev !== null ? ev : c.evidence;
  saveState(touch(state, now), cwd);
  appendLedger({ kind: "evidence_captured", id, status: st }, cwd, { at: now });
  return c;
}

export function addBlocker({ id, reason }, cwd, { now = new Date().toISOString() } = {}) {
  if (!id || !reason) throw new Error("blocker id and reason are required");
  const state = requireState(cwd);
  if (!state.reviewBlockers.some((b) => b.id === id)) {
    state.reviewBlockers.push({ id, reason, resolved: false, addedAt: now });
  }
  saveState(touch(state, now), cwd);
  appendLedger({ kind: "blocker_added", id, reason }, cwd, { at: now });
  return state.reviewBlockers;
}

export function resolveBlocker({ id }, cwd, { now = new Date().toISOString() } = {}) {
  const state = requireState(cwd);
  const b = state.reviewBlockers.find((x) => x.id === id);
  if (!b) throw new Error(`unknown blocker "${id}"`);
  b.resolved = true;
  b.resolvedAt = now;
  saveState(touch(state, now), cwd);
  appendLedger({ kind: "blocker_resolved", id }, cwd, { at: now });
  return b;
}

/**
 * Evaluate a steering instruction. Weakening instructions are refused and logged;
 * the caller must not act on them. Returns { accepted, reason }.
 */
export function steer({ text }, cwd, { now = new Date().toISOString() } = {}) {
  const verdict = classifySteering(text);
  if (verdict.weakening) {
    appendLedger({ kind: "steering_rejected", verb: verdict.verb, gate: verdict.gate, text: String(text).slice(0, 200) }, cwd, { at: now });
    return { accepted: false, reason: verdict.reason };
  }
  appendLedger({ kind: "steering_accepted", text: String(text).slice(0, 200) }, cwd, { at: now });
  return { accepted: true };
}

/** Mark the goal complete — only if the oracle says every gate is satisfied. */
export function complete(cwd, { now = new Date().toISOString() } = {}) {
  const state = requireState(cwd);
  if (state.completed) throw new Error("goal is already completed");
  const verdict = evaluate(state);
  if (!verdict.done) {
    appendLedger({ kind: "complete_refused", reasons: verdict.reasons }, cwd, { at: now });
    const err = new Error(`cannot complete — unmet gates:\n - ${verdict.reasons.join("\n - ")}`);
    err.reasons = verdict.reasons;
    throw err;
  }
  state.completed = true;
  state.completedAt = now;
  saveState(touch(state, now), cwd);
  appendLedger({ kind: "goal_completed" }, cwd, { at: now });
  return state;
}
