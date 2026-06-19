import { test } from "node:test";
import assert from "node:assert/strict";
import { parse, palette, banner, doctor, statusReport, main, cleanPackedDir, selectPermissionProfile, mcpConfigForProfile, permissionPlan, applyPermissionProfileToPackage } from "../bin/csw.mjs";
import { doctrine } from "../hooks/session-doctrine.mjs";
import { mkdtempSync, existsSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const packageVersion = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")).version;

test("parse: defaults and options", () => {
  assert.deepEqual(parse([]), { cmd: "status", theme: "violet", color: true, dryRun: false, permissionProfile: null });
  assert.equal(parse(["--help"]).cmd, "help");
  assert.equal(parse(["install"]).cmd, "install");
  assert.equal(parse(["install", "--dry-run", "--permission-profile", "safe"]).dryRun, true);
  assert.equal(parse(["install", "--dry-run", "--permission-profile", "safe"]).permissionProfile, "safe");
  assert.equal(parse(["--theme", "ocean"]).theme, "ocean");
  assert.equal(parse(["--theme", "bogus"]).theme, "violet"); // unknown -> default
  assert.equal(parse(["--no-color"]).color, false);
});

test("permission profile selection: explicit, env fallback, non-TTY safe default, invalid/custom fail", () => {
  assert.equal(selectPermissionProfile({ explicit: "balanced", isTTY: false }), "balanced");
  assert.equal(selectPermissionProfile({ env: { CSW_PERMISSION_PROFILE: "full" }, isTTY: false }), "full");
  assert.equal(selectPermissionProfile({ env: {}, isTTY: false }), "safe");
  assert.equal(selectPermissionProfile({ env: {}, isTTY: true, prompt: () => "none" }), "none");
  assert.throws(() => selectPermissionProfile({ explicit: "bogus", isTTY: false }), /invalid permission profile/);
  assert.throws(() => selectPermissionProfile({ explicit: "custom", isTTY: false }), /future work/);
});

test("mcpConfigForProfile: supported profiles map to explicit MCP tools and args", () => {
  const safe = mcpConfigForProfile("safe").config.mcpServers["csw-dispatch"];
  assert.deepEqual(safe.tools, ["code_search", "research"]);
  assert.deepEqual(safe.args, ["${PLUGIN_ROOT}/mcp/dispatch/server.mjs", "--permission-profile", "safe"]);
  const balanced = mcpConfigForProfile("balanced").config.mcpServers["csw-dispatch"];
  assert.deepEqual(balanced.tools, ["dispatch", "code_search", "research"]);
  assert.ok(balanced.args.includes("balanced"));
  const full = mcpConfigForProfile("full").config.mcpServers["csw-dispatch"];
  assert.ok(full.args.includes("full"));
  const none = mcpConfigForProfile("none").config.mcpServers["csw-dispatch"];
  assert.deepEqual(none.args, ["${PLUGIN_ROOT}/mcp/dispatch/server.mjs"]);
});

test("permission dry-run plan prints profile, path, MCP tools, and preservation", () => {
  const plan = permissionPlan("safe", "/tmp/pkg");
  assert.match(plan, /Permission profile: safe/);
  assert.match(plan, /Generated MCP config path: \/tmp\/pkg\/\.mcp\.json/);
  assert.match(plan, /MCP tools: code_search, research/);
  assert.match(plan, /preserved/);
});

test("palette: no-color yields empty codes; color yields ansi", () => {
  assert.equal(palette("violet", false).primary, "");
  assert.ok(palette("violet", true).primary.includes("\x1b["));
});

test("banner: contains product name + package version, color-free when disabled", () => {
  const b = banner("mono", false);
  assert.match(b, /Copilot-swarm/);
  assert.match(b, new RegExp(`v${packageVersion.replaceAll(".", "\\.")}`)); // synced from package.json
  assert.ok(!b.includes("\x1b["));
});

test("doctor: reports node, copilot presence, plugin state (injected run)", () => {
  const run = (cmd) => {
    if (cmd[1] === "--version") return { ok: true, out: "GitHub Copilot CLI 1.0.60\n" };
    if (cmd[1] === "plugin") return { ok: true, out: `Installed plugins:\n  copilot-swarm (v${packageVersion})\n` };
    return { ok: false, out: "" };
  };
  const d = doctor(run);
  assert.match(d.node, /^v\d+/);
  assert.match(d.copilot, /Copilot CLI/);
  assert.equal(d.pluginInstalled, true);
});

test("doctor: no copilot -> null + not installed", () => {
  const d = doctor(() => ({ ok: false, out: "" }));
  assert.equal(d.copilot, null);
  assert.equal(d.pluginInstalled, false);
});

test("statusReport: renders checks and skills/agents", () => {
  const r = statusReport({ node: "v22", copilot: "x", pluginInstalled: false }, false, "violet");
  assert.match(r, /GitHub Copilot CLI/);
  assert.match(r, /not installed — run: csw install/);
  assert.match(r, /swarm · csw-plan · csw-work · csw-review/);
});

test("main: help and doctor return 0", () => {
  assert.equal(main(["help"]), 0);
  assert.equal(main(["doctor"]), 0);
});

test("cleanPackedDir: packs PKG_ROOT (allowlist) and returns the extracted package dir", () => {
  const calls = [];
  const tmp = mkdtempSync(join(tmpdir(), "csw-pack-test-"));
  const exec = (cmd, args) => {
    calls.push([cmd, ...args]);
    if (cmd === "npm" && args[0] === "pack") return `copilot-swarm-${packageVersion}.tgz\n`;
    return "";
  };
  try {
    const { dir, cleanup } = cleanPackedDir("/fake/root", exec, () => tmp);
    assert.equal(dir, join(tmp, "package"));
    // packed the given root, then extracted the tgz
    assert.ok(calls.some((c) => c[0] === "npm" && c[1] === "pack" && c.includes("/fake/root")));
    assert.ok(calls.some((c) => c[0] === "tar" && c.includes("-xzf")));
    assert.ok(existsSync(tmp));
    cleanup();
    assert.ok(!existsSync(tmp), "cleanup removes the temp dir");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("cleanPackedDir: cleans up the temp dir if packing throws", () => {
  const tmp = mkdtempSync(join(tmpdir(), "csw-pack-err-"));
  const exec = () => { throw new Error("npm missing"); };
  assert.throws(() => cleanPackedDir("/fake/root", exec, () => tmp), /npm missing/);
  assert.ok(!existsSync(tmp), "temp dir removed on failure");
});

test("applyPermissionProfileToPackage preserves none and writes explicit profiles only", () => {
  const tmp = mkdtempSync(join(tmpdir(), "csw-prof-"));
  try {
    const mcp = join(tmp, ".mcp.json");
    writeFileSync(mcp, readFileSync(join(repoRoot, ".mcp.json"), "utf8"));
    const noneBefore = readFileSync(mcp, "utf8");
    assert.equal(applyPermissionProfileToPackage(tmp, "none").written, false);
    assert.equal(readFileSync(mcp, "utf8"), noneBefore);
    assert.equal(applyPermissionProfileToPackage(tmp, "safe").written, true);
    const updated = JSON.parse(readFileSync(mcp, "utf8"));
    assert.deepEqual(updated.mcpServers["csw-dispatch"].tools, ["code_search", "research"]);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("main: install dry-run writes nothing and reports selected permission profile", () => {
  const logs = [];
  const orig = console.log;
  console.log = (...a) => logs.push(a.join(" "));
  try {
    assert.equal(main(["install", "--dry-run", "--permission-profile", "safe"]), 0);
  } finally {
    console.log = orig;
  }
  const text = logs.join("\n");
  assert.match(text, /Permission profile: safe/);
  assert.match(text, /Dry run: no files written/);
});

test("main: invalid permission profile fails clearly", () => {
  const errs = [];
  const orig = console.error;
  console.error = (...a) => errs.push(a.join(" "));
  try {
    assert.equal(main(["install", "--dry-run", "--permission-profile", "bogus"]), 2);
  } finally {
    console.error = orig;
  }
  assert.match(errs.join("\n"), /invalid permission profile/);
});

test("doctrine: injects the runtime command so the model can call it", () => {
  const d = doctrine(() => "DOCTRINE BODY", 'node "/abs/path with space/bin/csw-runtime.mjs"');
  assert.match(d, /node "\/abs\/path with space\/bin\/csw-runtime\.mjs" <subcommand>/);
  assert.match(d, /not on PATH/);
});

test("doctrine: default runtime command quotes the path (spaces-safe)", () => {
  const d = doctrine(() => "BODY");
  assert.match(d, /node "[^"]*csw-runtime\.mjs"/); // path is quoted
});
