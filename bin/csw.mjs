#!/usr/bin/env node
// csw — Copilot-swarm installer / status CLI (dependency-free, ANSI-polished).
//
//   csw            status: environment + plugin state + next steps
//   csw install    install this package as a Copilot CLI plugin
//   csw doctor     environment diagnostics
//   csw help       usage
//
// Options: --theme <violet|ocean|mono>, --no-color

import { execFileSync } from "node:child_process";
import { realpathSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const VERSION = (() => {
  try { return JSON.parse(readFileSync(join(PKG_ROOT, "package.json"), "utf8")).version; }
  catch { return "0.0.0"; }
})();

const THEMES = {
  violet: { primary: "\x1b[38;5;99m", accent: "\x1b[38;5;213m" },
  ocean: { primary: "\x1b[38;5;39m", accent: "\x1b[38;5;51m" },
  mono: { primary: "\x1b[1m", accent: "\x1b[2m" },
};
const RESET = "\x1b[0m";
const OK = "\x1b[32m✓\x1b[0m";
const NO = "\x1b[31m✗\x1b[0m";

export function palette(themeName = "violet", color = true) {
  const t = THEMES[themeName] || THEMES.violet;
  if (!color) return { primary: "", accent: "", reset: "", paint: (s) => s };
  return { ...t, reset: RESET, paint: (s, c) => `${c}${s}${RESET}` };
}

export function banner(themeName = "violet", color = true) {
  const p = palette(themeName, color);
  const title = `Copilot-swarm (CSW) v${VERSION}`;
  const width = Math.max(title.length + 4, 31);
  const pad = (s) => s + " ".repeat(width - s.length);
  return [
    p.paint(`  ┌${"─".repeat(width)}┐`, p.primary),
    p.paint(`  │ ${pad(title)} │`, p.accent),
    p.paint(`  └${"─".repeat(width)}┘`, p.primary),
  ].join("\n");
}

/** Probe the environment. `run` is injectable for tests. */
export function doctor(run = defaultRun) {
  const copilot = run(["copilot", "--version"]);
  const installed = copilot.ok ? run(["copilot", "plugin", "list"]) : { ok: false, out: "" };
  return {
    node: process.version,
    copilot: copilot.ok ? copilot.out.trim().split("\n")[0] : null,
    pluginInstalled: installed.ok && /copilot-swarm/.test(installed.out),
  };
}

export function statusReport(d, color = true, themeName = "violet") {
  const p = palette(themeName, color);
  const ok = color ? OK : "[ok]";
  const no = color ? NO : "[--]";
  const line = (good, label, detail) => `  ${good ? ok : no} ${label}${detail ? p.paint(`  ${detail}`, p.accent) : ""}`;
  const out = [banner(themeName, color), ""];
  out.push(line(true, "Node", d.node));
  out.push(line(!!d.copilot, "GitHub Copilot CLI", d.copilot || "not found — install from https://docs.github.com/copilot/how-tos/copilot-cli"));
  out.push(line(d.pluginInstalled, "copilot-swarm plugin", d.pluginInstalled ? "installed" : "not installed — run: csw install"));
  out.push("");
  out.push(p.paint("  Skills:", p.primary) + " /copilot-swarm:swarm · csw-plan · csw-work · csw-review");
  out.push(p.paint("  Agents:", p.primary) + " explorer · researcher · planner · gap-analyst · plan-reviewer · verifier");
  return out.join("\n");
}

function defaultRun(cmd) {
  try {
    return { ok: true, out: execFileSync(cmd[0], cmd.slice(1), { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }) };
  } catch (e) {
    return { ok: false, out: e.stdout ? String(e.stdout) : "" };
  }
}

export function parse(argv) {
  const a = { cmd: "status", theme: "violet", color: true };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--theme") a.theme = argv[++i];
    else if (t === "--no-color") a.color = false;
    else if (!t.startsWith("-")) a.cmd = t;
  }
  if (!THEMES[a.theme]) a.theme = "violet";
  return a;
}

const USAGE = `csw — Copilot-swarm

  csw            status (environment + plugin state)
  csw install    install this package as a Copilot CLI plugin
  csw doctor     environment diagnostics (JSON)
  csw hud        print the settings snippet to enable the HUD status line
  csw help       this message

Options: --theme <violet|ocean|mono>  --no-color`;

export function main(argv) {
  const a = parse(argv);
  const color = a.color && process.stdout.isTTY !== false;
  if (a.cmd === "help") { console.log(USAGE); return 0; }
  if (a.cmd === "doctor") { console.log(JSON.stringify(doctor(), null, 2)); return 0; }
  if (a.cmd === "hud") {
    const cmd = `node "${join(PKG_ROOT, "bin", "csw-statusline.mjs")}"`;
    console.log("Add this to ~/.copilot/settings.json to enable the CSW HUD status line:\n");
    console.log(JSON.stringify({ statusLine: { command: cmd } }, null, 2));
    console.log("\nIt shows the active goal's criteria progress / blockers (nothing when no goal is active).");
    return 0;
  }
  if (a.cmd === "status") { console.log(statusReport(doctor(), color, a.theme)); return 0; }
  if (a.cmd === "install") {
    const mark = color ? OK : "[ok]";
    const fail = color ? NO : "[--]";
    const d = doctor();
    if (!d.copilot) { console.error(`${fail} GitHub Copilot CLI not found. Install it first.`); return 1; }
    console.log(`Installing copilot-swarm from ${PKG_ROOT} …`);
    try {
      execFileSync("copilot", ["plugin", "install", PKG_ROOT], { stdio: "inherit" });
      console.log(`${mark} Installed. Start a session: copilot`);
      return 0;
    } catch {
      console.error(`${fail} Install failed. Try: copilot plugin install ${PKG_ROOT}`);
      return 1;
    }
  }
  console.error(`Unknown command: ${a.cmd}\n\n${USAGE}`);
  return 2;
}

function isMainModule() {
  if (!process.argv[1]) return false;
  try { return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]); }
  catch { return fileURLToPath(import.meta.url) === process.argv[1]; }
}
if (isMainModule()) process.exit(main(process.argv.slice(2)));
