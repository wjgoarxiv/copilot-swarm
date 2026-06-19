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
import { realpathSync, readFileSync, writeFileSync, mkdtempSync, rmSync, openSync, closeSync, readSync, writeSync } from "node:fs";
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

export const PERMISSION_PROFILES = {
  safe: {
    tools: ["code_search", "research"],
    args: ["${PLUGIN_ROOT}/mcp/dispatch/server.mjs", "--permission-profile", "safe"],
    warning: "least privilege/read-mostly; dispatch is not exposed in generated MCP config",
  },
  balanced: {
    tools: ["dispatch", "code_search", "research"],
    args: ["${PLUGIN_ROOT}/mcp/dispatch/server.mjs", "--permission-profile", "balanced"],
    warning: "recommended; no broad --allow-all-tools grant unless a worker/tool asks interactively",
  },
  full: {
    tools: ["dispatch", "code_search", "research"],
    args: ["${PLUGIN_ROOT}/mcp/dispatch/server.mjs", "--permission-profile", "full"],
    warning: "WARNING: broad worker tool access via --allow-all-tools for dispatch workers",
  },
  none: {
    tools: ["dispatch", "code_search", "research"],
    args: ["${PLUGIN_ROOT}/mcp/dispatch/server.mjs"],
    warning: "do not modify CSW permission settings; install plugin files only",
  },
};

export function normalizePermissionProfile(value) {
  const p = String(value || "").toLowerCase();
  if (p === "custom") throw new Error("permission profile 'custom' is future work; choose safe, balanced, full, or none");
  if (!PERMISSION_PROFILES[p]) throw new Error(`invalid permission profile: ${value}`);
  return p;
}

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

export function mcpConfigForProfile(profile, baseText = readFileSync(join(PKG_ROOT, ".mcp.json"), "utf8")) {
  const p = normalizePermissionProfile(profile);
  const config = JSON.parse(baseText);
  const server = config.mcpServers?.["csw-dispatch"];
  if (!server) throw new Error(".mcp.json missing csw-dispatch server");
  server.args = [...PERMISSION_PROFILES[p].args];
  server.tools = [...PERMISSION_PROFILES[p].tools];
  return { profile: p, config };
}

export function applyPermissionProfileToPackage(packageDir, profile) {
  const p = normalizePermissionProfile(profile);
  if (p === "none") return { profile: p, path: join(packageDir, ".mcp.json"), written: false };
  const target = join(packageDir, ".mcp.json");
  const { config } = mcpConfigForProfile(p, readFileSync(target, "utf8"));
  writeFileSync(target, JSON.stringify(config, null, 2) + "\n");
  return { profile: p, path: target, written: true };
}

export function permissionPlan(profile, packageDir = "<clean package copy>") {
  const p = normalizePermissionProfile(profile);
  const where = join(packageDir, ".mcp.json");
  const { config } = mcpConfigForProfile(p);
  return [
    `Permission profile: ${p}`,
    `Profile details: ${PERMISSION_PROFILES[p].warning}`,
    `Generated MCP config path: ${where}`,
    `MCP tools: ${config.mcpServers["csw-dispatch"].tools.join(", ")}`,
    `MCP args: ${config.mcpServers["csw-dispatch"].args.join(" ")}`,
    `User Copilot/OpenCode config: preserved (CSW installer does not overwrite existing user permission settings)`,
  ].join("\n");
}

function promptTTY() {
  const menu = [
    "Select CSW permission profile:",
    "  1) safe     least privilege/read-mostly",
    "  2) balanced recommended",
    "  3) full     broad worker access (warning)",
    "  4) none     do not modify CSW permission settings",
    "custom profile: future work (not implemented)",
    "Choice [safe]: ",
  ].join("\n");
  let fd;
  try {
    fd = openSync("/dev/tty", "r+");
    writeSync(fd, menu);
    const buf = Buffer.alloc(64);
    const n = readSync(fd, buf, 0, buf.length, null);
    const answer = buf.toString("utf8", 0, n).trim().toLowerCase();
    return { "": "safe", "1": "safe", safe: "safe", "2": "balanced", balanced: "balanced", "3": "full", full: "full", "4": "none", none: "none" }[answer] || answer;
  } finally {
    if (fd !== undefined) try { closeSync(fd); } catch {}
  }
}

export function selectPermissionProfile({ explicit, env = process.env, isTTY = process.stdin.isTTY, prompt = promptTTY } = {}) {
  if (explicit) return normalizePermissionProfile(explicit);
  if (env.CSW_PERMISSION_PROFILE) return normalizePermissionProfile(env.CSW_PERMISSION_PROFILE);
  if (isTTY) return normalizePermissionProfile(prompt());
  return "safe";
}

function defaultRun(cmd) {
  try {
    return { ok: true, out: execFileSync(cmd[0], cmd.slice(1), { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }) };
  } catch (e) {
    return { ok: false, out: e.stdout ? String(e.stdout) : "" };
  }
}

export function parse(argv) {
  const a = { cmd: "status", theme: "violet", color: true, dryRun: false, permissionProfile: null };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--help" || t === "-h") a.cmd = "help";
    else if (t === "--theme") a.theme = argv[++i];
    else if (t === "--no-color") a.color = false;
    else if (t === "--dry-run") a.dryRun = true;
    else if (t === "--permission-profile") a.permissionProfile = argv[++i];
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
  --permission-profile <safe|balanced|full|none>  (custom: future work)

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
    let profile;
    try {
      profile = selectPermissionProfile({ explicit: a.permissionProfile });
    } catch (err) {
      console.error(`${fail} ${err.message}`);
      return 2;
    }
    if (a.dryRun) {
      console.log(permissionPlan(profile));
      console.log("Dry run: no files written and copilot plugin install was not run.");
      return 0;
    }
    const d = doctor();
    if (!d.copilot) { console.error(`${fail} GitHub Copilot CLI not found. Install it first.`); return 1; }
    console.log("Packing a clean copy (allowlisted files only) …");
    let packed;
    try {
      packed = cleanPackedDir();
    } catch {
      console.error(`${fail} Could not pack the package (is npm available?).`);
      return 1;
    }
    try {
      const applied = applyPermissionProfileToPackage(packed.dir, profile);
      console.log(permissionPlan(profile, packed.dir));
      if (applied.written) console.log(`Permission profile written: ${applied.path}`);
      else console.log("Permission profile write skipped by profile 'none'.");
      execFileSync("copilot", ["plugin", "install", packed.dir], { stdio: "inherit" });
      console.log(`${mark} Installed. Start a session: copilot`);
      return 0;
    } catch {
      console.error(`${fail} Install failed. Try: copilot plugin install ${packed.dir}`);
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
