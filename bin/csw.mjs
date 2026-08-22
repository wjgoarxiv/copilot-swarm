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
import { realpathSync, readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
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
const SEMVER = "(\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z.-]+)?)";

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
  const entry = installed.ok ? parsePluginList(installed.out) : { installed: null, version: null };
  return {
    node: process.version,
    copilot: copilot.ok ? copilot.out.trim().split("\n")[0] : null,
    pluginListOk: installed.ok,
    pluginInstalled: entry.installed,
    sourceVersion: VERSION,
    installedVersion: entry.version,
    versionMatches: entry.version ? entry.version === VERSION : null,
  };
}

export function parsePluginList(text) {
  let installed = false;
  const versionPattern = new RegExp(`^copilot-swarm\\s+\\(v${SEMVER}\\)$`);
  for (const raw of String(text || "").split(/\r?\n/)) {
    const line = raw.replace(/\x1b\[[0-9;]*m/g, "").trim().replace(/^(?:[•*-]\s*)/, "");
    const exact = line.match(versionPattern);
    if (exact) return { installed: true, version: exact[1] };
    if (/^copilot-swarm(?:\s|$)/.test(line)) installed = true;
  }
  return { installed, version: null };
}

export function statusReport(d, color = true, themeName = "violet") {
  const p = palette(themeName, color);
  const ok = color ? OK : "[ok]";
  const no = color ? NO : "[--]";
  const line = (good, label, detail) => `  ${good ? ok : no} ${label}${detail ? p.paint(`  ${detail}`, p.accent) : ""}`;
  const out = [banner(themeName, color), ""];
  out.push(line(true, "Node", d.node));
  out.push(line(!!d.copilot, "GitHub Copilot CLI", d.copilot || "not found — install from https://docs.github.com/copilot/how-tos/copilot-cli"));
  if (d.pluginListOk === false) {
    out.push(line(false, "copilot-swarm plugin", "PLUGIN LIST UNAVAILABLE — could not determine installation or version"));
  } else if (!d.pluginInstalled) {
    out.push(line(false, "copilot-swarm plugin", "not installed — run: csw install"));
  } else if (d.versionMatches) {
    out.push(line(true, "copilot-swarm plugin", `installed v${d.installedVersion} — version matches source`));
  } else if (d.installedVersion) {
    out.push(line(false, "copilot-swarm plugin", `VERSION MISMATCH — source v${d.sourceVersion}, installed v${d.installedVersion}; reinstall`));
  } else {
    out.push(line(false, "copilot-swarm plugin", `VERSION UNKNOWN — source v${d.sourceVersion}; reinstall or inspect copilot plugin list`));
  }
  out.push("");
  out.push(p.paint("  Skills:", p.primary) + " /copilot-swarm:swarm · csw-plan · csw-work · csw-review");
  out.push(p.paint("  Support:", p.primary) + " csw-debugging · csw-programming · csw-refactor · csw-visual-qa · 6 more");
  out.push(p.paint("  Agents:", p.primary) + " explorer · researcher · planner · gap-analyst · plan-reviewer · verifier");
  return out.join("\n");
}

/**
 * Pack PKG_ROOT (applying the package.json "files" allowlist) into a temp dir and
 * extract it, returning the clean package dir + a cleanup thunk. This guarantees a
 * clean install even from a dev checkout or an `npm install -g .` symlink (where
 * PKG_ROOT would otherwise contain # REFERENCE/, .csw/, tests, etc.).
 */
export function cleanPackedDir(pkgRoot = PKG_ROOT, exec = execFileSync, makeTmp = () => mkdtempSync(join(tmpdir(), "csw-pkg-"))) {
  const tmp = makeTmp();
  const cleanup = () => { try { rmSync(tmp, { recursive: true, force: true }); } catch {} };
  try {
    const name = String(exec("npm", ["pack", pkgRoot, "--silent"], { cwd: tmp, encoding: "utf8" })).trim().split("\n").pop();
    exec("tar", ["-xzf", join(tmp, name), "-C", tmp], { encoding: "utf8" });
    return { dir: join(tmp, "package"), cleanup };
  } catch (err) {
    cleanup();
    throw err;
  }
}

export function validatePackedCandidate(packageDir) {
  const load = (path, label) => {
    try { return JSON.parse(readFileSync(join(packageDir, path), "utf8")); }
    catch { throw new Error(`${label} is missing or invalid`); }
  };
  const pkg = load("package.json", "package manifest");
  const primary = load(".plugin/plugin.json", "primary plugin manifest");
  const github = load(".github/plugin/plugin.json", "GitHub plugin manifest");
  if (pkg.name !== "copilot-swarm" || primary.name !== pkg.name || github.name !== pkg.name) {
    throw new Error("plugin manifest names do not match package manifest");
  }
  if (!pkg.version || primary.version !== pkg.version || github.version !== pkg.version) {
    throw new Error("plugin manifest versions do not match package manifest");
  }
  return { name: pkg.name, version: pkg.version };
}

function defaultRun(cmd) {
  try {
    return { ok: true, out: execFileSync(cmd[0], cmd.slice(1), { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }) };
  } catch (e) {
    return { ok: false, out: e.stdout ? String(e.stdout) : "" };
  }
}

export function parse(argv) {
  const a = { cmd: "status", theme: "violet", color: true, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--help" || t === "-h") a.cmd = "help";
    else if (t === "--theme") {
      if (!argv[i + 1] || argv[i + 1].startsWith("-")) throw new Error("missing value for --theme");
      a.theme = argv[++i];
    }
    else if (t === "--no-color") a.color = false;
    else if (t === "--dry-run") a.dryRun = true;
    else if (t.startsWith("-")) throw new Error(`unknown option: ${t}`);
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

Install options:
  --dry-run

Options: --theme <violet|ocean|mono>  --no-color`;

export function main(argv, deps = {}) {
  let a;
  try {
    a = parse(argv);
  } catch (err) {
    console.error(`${err.message}\n\n${USAGE}`);
    return 2;
  }
  const probe = deps.doctor || doctor;
  const pack = deps.cleanPackedDir || cleanPackedDir;
  const execute = deps.execFileSync || execFileSync;
  const color = a.color && process.stdout.isTTY !== false;
  if (a.cmd === "help") { console.log(USAGE); return 0; }
  if (a.cmd === "doctor") { console.log(JSON.stringify(probe(), null, 2)); return 0; }
  if (a.cmd === "hud") {
    const cmd = `node "${join(PKG_ROOT, "bin", "csw-statusline.mjs")}"`;
    console.log("Add this to ~/.copilot/settings.json to enable the CSW HUD status line:\n");
    console.log(JSON.stringify({ statusLine: { command: cmd } }, null, 2));
    console.log("\nIt shows the active goal's criteria progress / blockers (nothing when no goal is active).");
    return 0;
  }
  if (a.cmd === "status") {
    const d = probe();
    console.log(statusReport(d, color, a.theme));
    return d.versionMatches === true ? 0 : 1;
  }
  if (a.cmd === "install") {
    const mark = color ? OK : "[ok]";
    const fail = color ? NO : "[--]";
    const d = probe();
    if (!d.copilot) { console.error(`${fail} GitHub Copilot CLI not found. Install it first.`); return 1; }
    console.log("Packing a clean copy (allowlisted files only) …");
    let packed;
    try {
      packed = pack();
    } catch {
      console.error(`${fail} Could not pack the package (is npm available?).`);
      return 1;
    }
    try {
      const candidate = validatePackedCandidate(packed.dir);
      if (a.dryRun) {
        console.log(`Dry run: validated clean packed candidate ${candidate.name}@${candidate.version}; no install was run.`);
        return 0;
      }
      execute("copilot", ["plugin", "install", packed.dir], { stdio: "inherit" });
      console.log(`${mark} Installed. Start a session: copilot`);
      return 0;
    } catch (err) {
      console.error(a.dryRun
        ? `${fail} Packed candidate validation failed: ${err.message}`
        : `${fail} Install failed. Resolve the Copilot CLI error, then rerun \`csw install\`.`);
      return 1;
    } finally {
      packed.cleanup();
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
