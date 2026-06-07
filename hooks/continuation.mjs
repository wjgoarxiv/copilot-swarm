#!/usr/bin/env node
// Continuation hook (agentStop / subagentStop).
//
// While an active CSW goal exists and the completion oracle says it is NOT done,
// this hook returns { decision: "block", reason } so Copilot CLI forces another
// turn instead of stopping. It is OPT-IN: with no `.csw/state.json` (no goal
// created) it never blocks, so unrelated sessions are unaffected.

import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadState } from "../runtime/src/store.mjs";
import { evaluate } from "../runtime/src/oracle.mjs";

/** Pure decision from a goal state. Exported for tests. */
export function decide(state) {
  if (!state || state.completed) return { block: false };
  // Invalid/empty goal (no criteria) must NOT trap the agent — there is nothing to
  // satisfy, so blocking would livelock with an impossible condition. Fail open.
  if (!Array.isArray(state.criteria) || state.criteria.length === 0) return { block: false };
  const v = evaluate(state);
  if (v.done) return { block: false };
  return {
    block: true,
    reason:
      `CSW goal "${state.objective}" is not complete. Unmet gates:\n - ${v.reasons.join("\n - ")}\n` +
      `Keep working toward these criteria and capture evidence with ` +
      `\`csw-runtime evidence --id <C0NN> --evidence <proof>\`. Do not stop until the ` +
      `completion oracle passes. If a blocker is genuinely unresolvable, escalate to the ` +
      `user; to abandon the goal entirely run \`csw-runtime clear\`.`,
  };
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
    // If nothing is piped, resolve promptly so the hook never hangs.
    setTimeout(finish, 250);
  });
}

async function main() {
  let payload = {};
  try {
    payload = JSON.parse((await readStdin()) || "{}");
  } catch {
    payload = {};
  }
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
