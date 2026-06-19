// Durable state store for the CSW goal runtime.
//
// State lives in a repo-local `.csw/` directory (Copilot CLI has no native goal
// surface). `state.json` is the current goal; `ledger.jsonl` is an append-only
// audit log. Writes are atomic (temp file + rename).

import { mkdirSync, readFileSync, writeFileSync, renameSync, existsSync, appendFileSync, rmSync, chmodSync } from "node:fs";
import { join } from "node:path";
import { redactObject } from "./redact.mjs";

export function cswDir(cwd = process.cwd()) {
  // CSW_HOME is a test/advanced override. Do NOT set it globally (e.g. in a shell
  // profile): every project would then share one goal state and the continuation
  // hook could block unrelated sessions. Normal use is the per-project `.csw/`.
  return process.env.CSW_HOME || join(cwd, ".csw");
}
export const statePath = (cwd) => join(cswDir(cwd), "state.json");
export const ledgerPath = (cwd) => join(cswDir(cwd), "ledger.jsonl");

export function removeState(cwd) {
  const p = statePath(cwd);
  if (existsSync(p)) rmSync(p, { force: true });
}

export function loadState(cwd) {
  const p = statePath(cwd);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf8"));
}

export function saveState(state, cwd) {
  const dir = cswDir(cwd);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  try { chmodSync(dir, 0o700); } catch {}
  const p = statePath(cwd);
  const tmp = `${p}.tmp`;
  writeFileSync(tmp, JSON.stringify(redactObject(state), null, 2), { mode: 0o600 });
  renameSync(tmp, p);
  try { chmodSync(p, 0o600); } catch {}
  return p;
}

/** Append one ledger entry (atomic append). `at` is injectable for determinism. */
export function appendLedger(entry, cwd, { at = new Date().toISOString() } = {}) {
  const dir = cswDir(cwd);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  try { chmodSync(dir, 0o700); } catch {}
  const p = ledgerPath(cwd);
  appendFileSync(p, JSON.stringify(redactObject({ at, ...entry })) + "\n", { mode: 0o600 });
  try { chmodSync(p, 0o600); } catch {}
}
