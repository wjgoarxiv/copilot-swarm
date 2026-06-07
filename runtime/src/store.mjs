// Durable state store for the CSW goal runtime.
//
// State lives in a repo-local `.csw/` directory (Copilot CLI has no native goal
// surface). `state.json` is the current goal; `ledger.jsonl` is an append-only
// audit log. Writes are atomic (temp file + rename).

import { mkdirSync, readFileSync, writeFileSync, renameSync, existsSync, appendFileSync } from "node:fs";
import { join } from "node:path";

export function cswDir(cwd = process.cwd()) {
  return process.env.CSW_HOME || join(cwd, ".csw");
}
export const statePath = (cwd) => join(cswDir(cwd), "state.json");
export const ledgerPath = (cwd) => join(cswDir(cwd), "ledger.jsonl");

export function loadState(cwd) {
  const p = statePath(cwd);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf8"));
}

export function saveState(state, cwd) {
  const dir = cswDir(cwd);
  mkdirSync(dir, { recursive: true });
  const p = statePath(cwd);
  const tmp = `${p}.tmp`;
  writeFileSync(tmp, JSON.stringify(state, null, 2));
  renameSync(tmp, p);
  return p;
}

/** Append one ledger entry (atomic append). `at` is injectable for determinism. */
export function appendLedger(entry, cwd, { at = new Date().toISOString() } = {}) {
  const dir = cswDir(cwd);
  mkdirSync(dir, { recursive: true });
  appendFileSync(ledgerPath(cwd), JSON.stringify({ at, ...entry }) + "\n");
}
