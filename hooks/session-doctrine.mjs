#!/usr/bin/env node
// Session doctrine injector (sessionStart).
//
// A plugin's AGENTS.md is NOT auto-loaded by Copilot CLI (only the workspace's own
// AGENTS.md is). Verified live: a sessionStart hook's `additionalContext` DOES reach
// the model. So CSW ships its always-on conductor + steering doctrine by reading its
// bundled AGENTS.md and injecting it at session start.

import { realpathSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readStdin } from "./lib/read-stdin.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const DOCTRINE_PATH = join(here, "..", "AGENTS.md");
const RUNTIME_PATH = join(here, "..", "bin", "csw-runtime.mjs");
// Absolute command for the goal-runtime CLI. The model cannot see ${PLUGIN_ROOT}
// and the bin is not on PATH after `copilot plugin install`, so inject the exact
// invocation here (fixes the "model called bare csw-runtime" gap).
const shellDoubleQuote = (value) => `"${String(value)
  .replaceAll("\\", "\\\\")
  .replaceAll('"', '\\"')
  .replaceAll("$", "\\$")
  .replaceAll("`", "\\`")}"`;
export const runtimeCommand = (runtimePath = RUNTIME_PATH) => `node ${shellDoubleQuote(runtimePath)}`;
const RUNTIME_CMD = runtimeCommand();
const MAX = 9000; // stay within additionalContext size limits

/** Build the doctrine context string. Exported for tests. */
export function doctrine(read = readFileSync, runtimeCmd = RUNTIME_CMD) {
  let body;
  try {
    body = String(read(DOCTRINE_PATH, "utf8")).trim();
  } catch {
    return null;
  }
  if (!body) return null;
  const clipped = body.length > MAX ? body.slice(0, MAX) + "\n…(truncated)" : body;
  const runtimeNote =
    `\n\n## Goal runtime CLI\nDrive the evidence-gated goal runtime with this exact ` +
    `command (it is not on PATH):\n\n    ${runtimeCmd} <subcommand>\n\n` +
    `Subcommands: init · show · status · verify · artifact · evidence · blocker · steer · complete · clear.`;
  return `Copilot-swarm (CSW) is active. Follow this doctrine:\n\n${clipped}${runtimeNote}`;
}

async function main() {
  await readStdin(); // drain; payload not needed
  const ctx = doctrine();
  if (ctx) process.stdout.write(JSON.stringify({ additionalContext: ctx }) + "\n");
  process.exit(0);
}

function isMainModule() {
  if (!process.argv[1]) return false;
  try { return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]); }
  catch { return fileURLToPath(import.meta.url) === process.argv[1]; }
}
if (isMainModule()) main();
