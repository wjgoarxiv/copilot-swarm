#!/usr/bin/env node
// Steering guard hook (userPromptSubmitted).
//
// Detects prompts that try to weaken a completion gate (skip/bypass/dismiss/
// auto-complete tests, QA, review, or criteria) and records them in the ledger
// (audit trail) when a goal is active.
//
// NOTE (verified live): Copilot CLI does NOT surface a userPromptSubmitted hook's
// `additionalContext` to the model. The always-on refusal doctrine is therefore
// injected via the sessionStart hook (session-doctrine.mjs); this hook's primary
// role is detection + audit logging. The additionalContext emit is retained as a
// forward-compatible no-op in case a future/interactive surface honors it.

import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { classifySteering } from "../runtime/src/steering.mjs";
import { loadState, appendLedger } from "../runtime/src/store.mjs";
import { safeMode } from "../runtime/src/redact.mjs";
import { readStdin } from "./lib/read-stdin.mjs";

/** Pure: refusal guidance for a prompt, or null if it is not weakening. Exported for tests. */
export function guidance(prompt) {
  const v = classifySteering(prompt);
  if (!v.weakening) return null;
  return (
    `[CSW steering guard] The latest instruction appears to weaken a completion gate ` +
    `("${v.gate}" via "${v.verb}"). Do NOT skip, bypass, dismiss, or auto-complete tests, ` +
    `manual QA, review, or success criteria. Legitimate scope changes are fine, but the ` +
    `completion bar (real evidence per criterion, zero open blockers) must not be lowered.`
  );
}

async function main() {
  let payload = {};
  try { payload = JSON.parse((await readStdin()) || "{}"); } catch { payload = {}; }
  const prompt = payload.prompt || payload.userPrompt || "";
  const cwd = payload.cwd || process.cwd();
  if (safeMode()) process.exit(0);
  const verdict = classifySteering(prompt);
  const g = guidance(prompt);
  if (g) {
    // Record which verb/gate pair matched, not just truncated text: a 200-char
    // slice hides the tripping span when the flagged prompt is long.
    try {
      if (loadState(cwd)) {
        appendLedger({
          kind: "steering_flagged",
          verb: verdict.verb,
          gate: verdict.gate,
          text: String(prompt).slice(0, 200),
        }, cwd);
      }
    } catch {}
    process.stdout.write(JSON.stringify({ additionalContext: g }) + "\n");
  }
  process.exit(0);
}

function isMainModule() {
  if (!process.argv[1]) return false;
  try { return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]); }
  catch { return fileURLToPath(import.meta.url) === process.argv[1]; }
}
if (isMainModule()) main();
