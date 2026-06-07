#!/usr/bin/env node
// postinstall — print a TUI-styled title when the package is installed.
// MUST never fail the install: everything is wrapped and it always exits 0.

import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const V = (() => {
  try {
    const root = join(dirname(fileURLToPath(import.meta.url)), "..");
    return JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
  } catch {
    return "0.1.0";
  }
})();

// ASCII wordmark for "CSW" (5 rows).
const WORDMARK = [
  " ██████ ███████ ██     ██",
  "██      ██      ██     ██",
  "██      ███████ ██  █  ██",
  "██           ██ ██ ███ ██",
  " ██████ ███████  ███ ███ ",
];

const C = {
  v: "\x1b[38;5;99m", // violet
  a: "\x1b[38;5;213m", // magenta accent
  d: "\x1b[2m",
  b: "\x1b[1m",
  r: "\x1b[0m",
};

/** Build the banner string. `color` toggles ANSI. Exported for tests. */
export function renderInstallBanner(color = true, version = V) {
  const p = color ? C : { v: "", a: "", d: "", b: "", r: "" };
  const lines = [];
  lines.push("");
  for (const row of WORDMARK) lines.push(`  ${p.v}${row}${p.r}`);
  lines.push("");
  lines.push(`  ${p.b}${p.a}copilot-swarm${p.r}  ${p.d}v${version}${p.r}`);
  lines.push(`  ${p.d}parallel delegation · evidence-gated workflow for GitHub Copilot CLI${p.r}`);
  lines.push("");
  lines.push(`  ${p.v}Next${p.r}   ${p.b}csw install${p.r}  →  ${p.b}copilot${p.r}`);
  lines.push(`  ${p.v}Help${p.r}   csw status · csw hud · csw help`);
  lines.push("");
  return lines.join("\n");
}

function isMainModule() {
  if (!process.argv[1]) return false;
  try { return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]); }
  catch { return fileURLToPath(import.meta.url) === process.argv[1]; }
}

// Only run side effects when executed directly (never on import, e.g. from tests).
if (isMainModule()) {
  try {
    const color = process.stdout.isTTY === true && !process.env.NO_COLOR;
    // Skip the banner in CI / silent installs to avoid log noise.
    if (!process.env.CI && process.env.npm_config_loglevel !== "silent") {
      process.stdout.write(renderInstallBanner(color) + "\n");
    }
  } catch {
    // never fail an install because of a banner
  }
  process.exit(0);
}
