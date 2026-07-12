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
    return "0.1.2";
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
  shadow: "\x1b[38;5;238m", // dim gray drop-shadow
  d: "\x1b[2m",
  b: "\x1b[1m",
  r: "\x1b[0m",
};

/**
 * Render the wordmark with a down-right drop shadow: a dim `░` layer offset by
 * (+1 row, +1 col) sits behind the bright `█` letters. Works with or without color
 * (the shade char keeps the shadow legible in no-color terminals).
 */
function wordmarkLines(p) {
  const width = Math.max(...WORDMARK.map((r) => r.length));
  const rows = WORDMARK.map((r) => r.padEnd(width, " "));
  const H = rows.length;
  // layer grid: 0 empty, 1 shadow, 2 main — one extra row/col for the offset.
  const layer = Array.from({ length: H + 1 }, () => new Array(width + 1).fill(0));
  for (let r = 0; r < H; r++)
    for (let c = 0; c < width; c++)
      if (rows[r][c] !== " " && layer[r + 1][c + 1] === 0) layer[r + 1][c + 1] = 1;
  for (let r = 0; r < H; r++)
    for (let c = 0; c < width; c++)
      if (rows[r][c] !== " ") layer[r][c] = 2;
  return layer.map((row) => {
    let line = "  ";
    for (const v of row) {
      if (v === 2) line += `${p.v}█${p.r}`;
      else if (v === 1) line += `${p.shadow}░${p.r}`;
      else line += " ";
    }
    return line.replace(/\s+$/, "");
  });
}

/** Build the banner string. `color` toggles ANSI. Exported for tests. */
export function renderInstallBanner(color = true, version = V) {
  const p = color ? C : { v: "", a: "", shadow: "", d: "", b: "", r: "" };
  const lines = [];
  lines.push("");
  for (const row of wordmarkLines(p)) lines.push(row);
  lines.push("");
  lines.push(`  ${p.b}${p.a}copilot-swarm${p.r}  ${p.d}v${version}${p.r}`);
  lines.push(`  ${p.d}evidence-gated delivery governance · native GitHub Copilot CLI${p.r}`);
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
