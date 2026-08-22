#!/usr/bin/env node
// Continuation hook (root agentStop only).
//
// While an active CSW goal exists and the completion oracle says it is NOT done,
// this hook returns { decision: "block", reason } so Copilot CLI forces another
// turn instead of stopping. It is OPT-IN: with no `.csw/state.json` (no goal
// created) it never blocks, so unrelated sessions are unaffected.

import { realpathSync } from "node:fs";
import { basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadState } from "../runtime/src/store.mjs";
import { evaluate } from "../runtime/src/oracle.mjs";
import { CRITERION_ID_RE } from "../runtime/src/criteria.mjs";
import { validateReceipt } from "../runtime/src/receipts.mjs";
import { redactText, safeMode, sanitizeLine } from "../runtime/src/redact.mjs";
import { readStdin } from "./lib/read-stdin.mjs";

const DEFAULT_STALE_MS = 7 * 24 * 60 * 60 * 1000;

function staleMs(env = process.env) {
  const n = Number(env.CSW_CONTINUATION_STALE_MS);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_STALE_MS;
}

function isStale(state, now = Date.now(), env = process.env) {
  const stamp = state?.updatedAt || state?.createdAt;
  const t = Date.parse(stamp);
  return Number.isFinite(t) && now - t > staleMs(env);
}

const validTimestamp = (value) => typeof value === "string" && Number.isFinite(Date.parse(value));
const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const nonempty = (value) => typeof value === "string" && value.length > 0;

function validNote(note) {
  if (!object(note) || !["legacy", "legacy-receipt", "note"].includes(note.type) || note.verified !== false) return false;
  if (note.at !== undefined && !validTimestamp(note.at)) return false;
  return (note.text === undefined || typeof note.text === "string") &&
    (note.reason === undefined || typeof note.reason === "string");
}

function validReceipt(receipt, status) {
  if (receipt === null || receipt === undefined) return status !== "pass";
  return validateReceipt(receipt).valid;
}

function validActiveState(state) {
  if (!object(state) || state.version !== 2 || !nonempty(state.goalId) || typeof state.objective !== "string" || typeof state.completed !== "boolean") return false;
  if (!validTimestamp(state.createdAt) || !validTimestamp(state.updatedAt)) return false;
  if (!Array.isArray(state.criteria) || state.criteria.length === 0 || !Array.isArray(state.reviewBlockers)) return false;
  if (!state.criteria.every((criterion) => object(criterion) &&
    typeof criterion.id === "string" && CRITERION_ID_RE.test(criterion.id) &&
    nonempty(criterion.channel) && nonempty(criterion.test) && nonempty(criterion.scenario) &&
    ["pending", "pass", "fail", "blocked"].includes(criterion.status) &&
    Number.isInteger(criterion.revision) && criterion.revision >= 0 &&
    Array.isArray(criterion.notes) && criterion.notes.every(validNote) &&
    validReceipt(criterion.receipt, criterion.status))) return false;
  return state.reviewBlockers.every((blocker) => object(blocker) &&
    nonempty(blocker.id) && nonempty(blocker.reason) && typeof blocker.resolved === "boolean" &&
    validTimestamp(blocker.addedAt) && (!blocker.resolved || validTimestamp(blocker.resolvedAt)));
}

/** Pure decision from a goal state. Exported for tests. */
export function decide(state, opts = {}) {
  try {
    if (opts.safeMode || safeMode(opts.env)) return { block: false };
    if (!state || state.completed || state.__cswRecovered || !validActiveState(state)) return { block: false };
    if (isStale(state, opts.now ?? Date.now(), opts.env)) return { block: false };
    const v = evaluate(state);
    if (v.done) return { block: false };
    const objective = sanitizeLine(state.objective, 120);
    const reasons = v.reasons.map((r) => redactText(r));
    return {
      block: true,
      reason:
        `CSW goal "${objective}" is not complete. Unmet gates:\n - ${reasons.join("\n - ")}\n` +
        `Keep working toward these criteria. When a criterion still depends on work product that does ` +
        `not exist yet, delegate that work with the host \`task\` subagent tool before verifying; as ` +
        `conductor you integrate and verify, and never take over an assigned worker's mutation. ` +
        `Use the exact runtime invocation supplied at session start ` +
        `with \`verify --id <C0NN> -- <argv...>\` or ` +
        `\`artifact --id <C0NN> --path <workspace-file> --summary <observed-outcome>\`. ` +
        `Do not stop until the completion oracle passes. If a blocker is genuinely unresolvable, escalate to the ` +
        `user; abandon the goal only through that same runtime invocation with \`clear\`.`,
    };
  } catch {
    return { block: false };
  }
}

/** Accept only positively identified root agentStop payloads. */
export function isRootStopPayload(payload) {
  if (!object(payload)) return false;
  const { sessionId, transcriptPath } = payload;
  if (!nonempty(sessionId) || !nonempty(transcriptPath) || sessionId.startsWith("call_")) return false;
  return basename(dirname(transcriptPath)) === sessionId;
}

async function main() {
  let payload = {};
  try {
    payload = JSON.parse((await readStdin()) || "{}");
  } catch {
    payload = {};
  }
  if (safeMode() || !isRootStopPayload(payload)) process.exit(0);
  const cwd = payload.cwd || process.cwd();
  let state = null;
  try {
    state = loadState(cwd);
  } catch {
    state = null;
  }
  const d = decide(state);
  if (d.block) {
    process.stdout.write(JSON.stringify({ decision: "block", reason: d.reason }) + "\n");
  }
  process.exit(0);
}

function isMainModule() {
  if (!process.argv[1]) return false;
  try { return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]); }
  catch { return fileURLToPath(import.meta.url) === process.argv[1]; }
}
if (isMainModule()) main();
