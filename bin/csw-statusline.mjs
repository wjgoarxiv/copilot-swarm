#!/usr/bin/env node
// csw-statusline — a HUD for Copilot CLI's `statusLine` surface.
//
// Copilot CLI renders a custom status line below the input by running a command
// that receives the session status as JSON on stdin and prints the line to stdout.
// This HUD surfaces the active CSW goal: criteria progress, open blockers, and the
// objective — so swarm/goal state is always visible. With no active goal it prints
// nothing (unobtrusive, opt-in).
//
// Enable (in ~/.copilot/settings.json):
//   "statusLine": { "command": "node \"<plugin>/bin/csw-statusline.mjs\"" }
// (run `csw hud` to print the exact snippet with the resolved path)

import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadState } from "../runtime/src/store.mjs";
import { sanitizeLine } from "../runtime/src/redact.mjs";

/** Pure: render the HUD string from a goal state. Exported for tests. */
export function render(state) {
  if (!state || !Array.isArray(state.criteria) || state.criteria.length === 0) return "";
  const total = state.criteria.length;
  const pass = state.criteria.filter((c) => c.status === "pass").length;
  const fail = state.criteria.filter((c) => c.status === "fail" || c.status === "blocked").length;
  const openBlockers = (state.reviewBlockers || []).filter((b) => !b.resolved).length;
  const parts = ["⚡ CSW"];
  if (state.completed) {
    parts.push("✓ complete");
  } else {
    parts.push(`${pass}/${total} criteria`);
    if (fail > 0) parts.push(`✗${fail}`);
  }
  if (openBlockers > 0) parts.push(`⛔ ${openBlockers} blocker${openBlockers > 1 ? "s" : ""}`);
  const obj = sanitizeLine(state.objective || "", 40);
  if (obj) parts.push(obj.length > 40 ? obj.slice(0, 39) + "…" : obj);
  return parts.join(" · ");
}

function readStdin() {
  return new Promise((resolve) => {
    let buf = "";
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(buf); } };
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (d) => (buf += d));
    process.stdin.on("end", finish);
    process.stdin.on("error", finish);
    setTimeout(finish, 250);
  });
}

async function main() {
  let status = {};
  try { status = JSON.parse((await readStdin()) || "{}"); } catch { status = {}; }
  const cwd = status.cwd || status.workspaceRoot || process.cwd();
  let state = null;
  try { state = loadState(cwd); } catch { state = null; }
  const line = render(state);
  if (line) process.stdout.write(line + "\n");
  process.exit(0);
}

function isMainModule() {
  if (!process.argv[1]) return false;
  try { return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]); }
  catch { return fileURLToPath(import.meta.url) === process.argv[1]; }
}
if (isMainModule()) main();
