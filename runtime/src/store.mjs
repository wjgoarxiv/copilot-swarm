// Durable, cross-process-safe state store for the CSW goal runtime.

import {
  appendFileSync, chmodSync, existsSync, mkdirSync, readFileSync, renameSync,
  rmSync, statSync, writeFileSync,
} from "node:fs";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { redactObject } from "./redact.mjs";
import { validateReceipt } from "./receipts.mjs";

const LOCK_WAIT_MS = 5_000;
const LOCK_STALE_MS = 15_000;
const SLEEP = new Int32Array(new SharedArrayBuffer(4));

export function cswDir(cwd = process.cwd()) {
  return process.env.CSW_HOME || join(cwd, ".csw");
}
export const statePath = (cwd) => join(cswDir(cwd), "state.json");
export const ledgerPath = (cwd) => join(cswDir(cwd), "ledger.jsonl");
const lockPath = (cwd) => join(cswDir(cwd), "state.lock");
export const hasState = (cwd) => existsSync(statePath(cwd));

function ensureDir(cwd) {
  const dir = cswDir(cwd);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  try { chmodSync(dir, 0o700); } catch {}
  return dir;
}

function acquireLock(cwd, { waitMs = LOCK_WAIT_MS, staleMs = LOCK_STALE_MS } = {}) {
  ensureDir(cwd);
  const path = lockPath(cwd);
  const token = `${process.pid}-${randomUUID()}`;
  const started = Date.now();
  while (true) {
    try {
      mkdirSync(path, { mode: 0o700 });
      writeFileSync(join(path, "owner"), JSON.stringify({ pid: process.pid, token }), { mode: 0o600 });
      return { path, token };
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      try {
        if (recoverStaleLock(path, staleMs)) {
          continue;
        }
      } catch (staleError) {
        if (staleError?.code === "ENOENT") continue;
        throw staleError;
      }
      if (Date.now() - started >= waitMs) throw new Error(`timed out waiting for state lock after ${waitMs}ms`);
      Atomics.wait(SLEEP, 0, 0, Math.min(25, waitMs - (Date.now() - started)));
    }
  }
}

function processIsAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code !== "ESRCH";
  }
}

function readOwner(path) {
  try {
    const owner = JSON.parse(readFileSync(join(path, "owner"), "utf8"));
    if (!Number.isInteger(owner?.pid) || owner.pid <= 0 || typeof owner?.token !== "string" || !owner.token) return null;
    return owner;
  } catch {
    return null;
  }
}

function observeRecoverableLock(path, staleMs) {
  const stat = statSync(path);
  if (Date.now() - stat.mtimeMs <= staleMs) return null;
  const owner = readOwner(path);
  if (owner && processIsAlive(owner.pid)) return null;
  return { device: stat.dev, inode: stat.ino, ownerToken: owner?.token || null };
}

function sameObservation(path, observed) {
  const stat = statSync(path);
  const owner = readOwner(path);
  return stat.dev === observed.device && stat.ino === observed.inode && (owner?.token || null) === observed.ownerToken;
}

function recoverStaleClaim(claim, staleMs) {
  try {
    if (Date.now() - statSync(claim).mtimeMs <= staleMs) return;
    const owner = readOwner(claim);
    if (!owner || !processIsAlive(owner.pid)) rmSync(claim, { recursive: true, force: true });
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

function recoverStaleLock(path, staleMs) {
  const observed = observeRecoverableLock(path, staleMs);
  if (!observed) return false;
  const claim = join(path, "recovery");
  const claimToken = `${process.pid}-${randomUUID()}`;
  try {
    mkdirSync(claim, { mode: 0o700 });
    writeFileSync(join(claim, "owner"), JSON.stringify({ pid: process.pid, token: claimToken }), { mode: 0o600 });
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
    recoverStaleClaim(claim, staleMs);
    return false;
  }
  let quarantine = null;
  try {
    if (!sameObservation(path, observed)) return false;
    quarantine = `${path}.quarantine.${process.pid}.${randomUUID()}`;
    renameSync(path, quarantine);
    rmSync(quarantine, { recursive: true, force: true });
    quarantine = null;
    return true;
  } finally {
    if (quarantine && existsSync(quarantine)) rmSync(quarantine, { recursive: true, force: true });
    if (existsSync(claim) && readOwner(claim)?.token === claimToken) rmSync(claim, { recursive: true, force: true });
  }
}

function releaseLock(lock) {
  try {
    if (readOwner(lock.path)?.token === lock.token) {
      rmSync(lock.path, { recursive: true, force: true });
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

function parseState(cwd) {
  const path = statePath(cwd);
  if (!existsSync(path)) return { state: null, migrated: false };
  let state;
  try {
    state = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`malformed state at ${path}: ${error.message}`);
  }
  let migrated = state?.version !== 2;
  if (migrated) state = migrateState(state);
  else migrated = normalizeV2State(state);
  attachCwd(state, cwd);
  return { state, migrated };
}

function normalizeV2State(state) {
  let changed = false;
  if (!Array.isArray(state.criteria)) return false;
  for (const criterion of state.criteria) {
    if (!Number.isSafeInteger(criterion.revision) || criterion.revision < 0) {
      criterion.revision = 0;
      changed = true;
    }
    if (criterion.receipt === undefined) {
      criterion.receipt = null;
      changed = true;
    }
    const receipt = criterion?.receipt;
    const valid = receipt === null || receipt === undefined ? { valid: criterion.status !== "pass" } : validateReceipt(receipt);
    const revisionMatches = receipt === null || receipt === undefined || receipt.criterionRevision + 1 === criterion.revision;
    const statusMatches = receipt === null || receipt === undefined || (valid.valid && expectedReceiptStatus(receipt) === criterion.status);
    if (valid.valid && revisionMatches && statusMatches) continue;
    criterion.status = "pending";
    criterion.receipt = null;
    criterion.notes = Array.isArray(criterion.notes) ? criterion.notes : [];
    criterion.notes.push({ type: "legacy-receipt", verified: false, reason: "unsafe or malformed receipt removed" });
    criterion.revision += 1;
    changed = true;
  }
  if (state.completed && (state.criteria.some((criterion) => criterion.status !== "pass" || !criterion.receipt) || (state.reviewBlockers || []).some((blocker) => !blocker.resolved))) {
    state.completed = false;
    delete state.completedAt;
    changed = true;
  }
  if (changed) {
    state.completed = false;
    delete state.completedAt;
  }
  return changed;
}

function expectedReceiptStatus(receipt) {
  if (receipt.type === "artifact") return "pass";
  return receipt.exitCode === 0 && !receipt.signal && !receipt.timedOut && !receipt.errorCode && !receipt.output.limitExceeded ? "pass" : "fail";
}

function attachCwd(state, cwd) {
  if (state && typeof state === "object") {
    Object.defineProperty(state, "__cswCwd", { value: cwd, configurable: true, enumerable: false });
  }
  return state;
}

export function migrateState(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("malformed state: expected an object");
  if (input.version !== 1 && input.version !== undefined) throw new Error(`unsupported state schema version ${input.version}`);
  if (!Array.isArray(input.criteria)) throw new Error("malformed state: criteria must be an array");
  const state = { ...input, version: 2, goalId: input.goalId || randomUUID(), completed: false };
  delete state.completedAt;
  state.criteria = input.criteria.map((criterion) => {
    const legacy = typeof criterion.evidence === "string" && criterion.evidence.trim() ? criterion.evidence : null;
    const notes = Array.isArray(criterion.notes) ? [...criterion.notes] : [];
    if (legacy) notes.push({ type: "legacy", verified: false, text: legacy });
    const status = legacy ? "pending" : (["fail", "blocked"].includes(criterion.status) ? criterion.status : "pending");
    const migrated = { ...criterion, status, revision: 0, receipt: null, notes };
    delete migrated.evidence;
    return migrated;
  });
  return state;
}

function writeStateUnlocked(state, cwd) {
  ensureDir(cwd);
  const path = statePath(cwd);
  const tmp = `${path}.${process.pid}.${randomUUID()}.tmp`;
  try {
    writeFileSync(tmp, JSON.stringify(redactObject(state), null, 2), { mode: 0o600 });
    renameSync(tmp, path);
    try { chmodSync(path, 0o600); } catch {}
  } finally {
    if (existsSync(tmp)) rmSync(tmp, { force: true });
  }
  return path;
}

/**
 * Run a synchronous read-modify-write while holding the repo-local state lock.
 * The callback returns { nextState, value, write }; migrations are persisted even
 * when the caller is otherwise read-only.
 */
export function transactState(cwd, update, options = {}) {
  const lock = acquireLock(cwd, options);
  try {
    const loaded = parseState(cwd);
    const result = update(loaded.state, { migrated: loaded.migrated }) || {};
    const nextState = Object.hasOwn(result, "nextState") ? result.nextState : loaded.state;
    // Receipt/schema cleanup is mandatory durability work. A read-only callback
    // may suppress its own write, but cannot suppress migration of nextState.
    const shouldWrite = loaded.migrated || (result.write !== false && (result.write === true || nextState !== loaded.state));
    if (nextState === null) {
      const path = statePath(cwd);
      if (existsSync(path)) rmSync(path, { force: true });
    } else if (shouldWrite) {
      writeStateUnlocked(nextState, cwd);
    }
    attachCwd(nextState, cwd);
    return Object.hasOwn(result, "value") ? result.value : nextState;
  } finally {
    releaseLock(lock);
  }
}

export function loadState(cwd) {
  if (!hasState(cwd)) return null;
  return transactState(cwd, (state, { migrated }) => {
    if (migrated && state) {
      Object.defineProperty(state, "__cswRecovered", { value: true, configurable: true, enumerable: false });
    }
    return { nextState: state, value: state, write: migrated };
  });
}

export function saveState(state, cwd) {
  return transactState(cwd, () => ({ nextState: state, value: statePath(cwd), write: true }));
}

export function removeState(cwd) {
  transactState(cwd, () => ({ nextState: null }));
}

export function appendLedger(entry, cwd, { at = new Date().toISOString() } = {}) {
  ensureDir(cwd);
  const path = ledgerPath(cwd);
  appendFileSync(path, JSON.stringify(redactObject({ at, ...entry })) + "\n", { mode: 0o600 });
  try { chmodSync(path, 0o600); } catch {}
}
