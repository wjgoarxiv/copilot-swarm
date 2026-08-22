import { test } from "node:test";
import assert from "node:assert/strict";
import { parse, palette, banner, doctor, statusReport, main, cleanPackedDir, validatePackedCandidate } from "../bin/csw.mjs";
import { doctrine } from "../hooks/session-doctrine.mjs";
import { mkdtempSync, existsSync, rmSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const packageVersion = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")).version;

test("parse: defaults and options", () => {
  assert.deepEqual(parse([]), { cmd: "status", theme: "violet", color: true, dryRun: false });
  assert.equal(parse(["--help"]).cmd, "help");
  assert.equal(parse(["install"]).cmd, "install");
  assert.equal(parse(["install", "--dry-run"]).dryRun, true);
  assert.equal(parse(["--theme", "ocean"]).theme, "ocean");
  assert.equal(parse(["--theme", "bogus"]).theme, "violet"); // unknown -> default
  assert.equal(parse(["--no-color"]).color, false);
});

test("parse: rejects unknown and removed options", () => {
  assert.throws(() => parse(["install", "--dry-rnu"]), /unknown option: --dry-rnu/);
  assert.throws(() => parse(["install", "--permission-profile", "safe"]), /unknown option: --permission-profile/);
  assert.throws(() => parse(["install", "--permission-profile=safe"]), /unknown option: --permission-profile=safe/);
});

test("main: unknown option is a usage error and cannot reach install preparation", () => {
  let prepared = false;
  const errors = [];
  const original = console.error;
  console.error = (...args) => errors.push(args.join(" "));
  try {
    assert.equal(main(["install", "--dry-rnu"], { cleanPackedDir: () => { prepared = true; } }), 2);
  } finally {
    console.error = original;
  }
  assert.equal(prepared, false);
  assert.match(errors.join("\n"), /unknown option: --dry-rnu/);
  assert.match(errors.join("\n"), /csw install/);
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
  assert.equal(d.sourceVersion, packageVersion);
  assert.equal(d.installedVersion, packageVersion);
  assert.equal(d.versionMatches, true);
});

test("doctor: no copilot -> plugin installation state is unknown", () => {
  const d = doctor(() => ({ ok: false, out: "" }));
  assert.equal(d.copilot, null);
  assert.equal(d.pluginListOk, false);
  assert.equal(d.pluginInstalled, null);
  assert.equal(d.installedVersion, null);
  assert.equal(d.versionMatches, null);
});

test("statusReport: renders checks and skills/agents", () => {
  const r = statusReport({ node: "v22", copilot: "x", pluginInstalled: false, sourceVersion: packageVersion, installedVersion: null, versionMatches: null }, false, "violet");
  assert.match(r, /GitHub Copilot CLI/);
  assert.match(r, /not installed — run: csw install/);
  assert.match(r, /swarm · csw-plan · csw-work · csw-review/);
  assert.match(r, /csw-debugging · csw-programming · csw-refactor · csw-visual-qa/);
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

function packedCandidate() {
  const dir = mkdtempSync(join(tmpdir(), "csw-candidate-"));
  mkdirSync(join(dir, ".plugin"), { recursive: true });
  mkdirSync(join(dir, ".github/plugin"), { recursive: true });
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "copilot-swarm", version: packageVersion }));
  const manifest = JSON.stringify({ name: "copilot-swarm", version: packageVersion });
  writeFileSync(join(dir, ".plugin/plugin.json"), manifest);
  writeFileSync(join(dir, ".github/plugin/plugin.json"), manifest);
  return dir;
}

test("validatePackedCandidate: requires synchronized package and plugin manifests", () => {
  const dir = packedCandidate();
  try {
    assert.deepEqual(validatePackedCandidate(dir), { name: "copilot-swarm", version: packageVersion });
    rmSync(join(dir, ".plugin"), { recursive: true, force: true });
    assert.throws(() => validatePackedCandidate(dir), /plugin manifest/i);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("main: install dry-run probes Copilot, prepares and validates a clean candidate, then cleans up without install", () => {
  const dir = packedCandidate();
  const logs = [];
  const orig = console.log;
  let cleaned = false;
  let installs = 0;
  console.log = (...a) => logs.push(a.join(" "));
  try {
    assert.equal(main(["install", "--dry-run"], {
      doctor: () => ({ copilot: "GitHub Copilot CLI 1.0.70." }),
      cleanPackedDir: () => ({ dir, cleanup: () => { cleaned = true; rmSync(dir, { recursive: true, force: true }); } }),
      execFileSync: () => { installs++; },
    }), 0);
  } finally {
    console.log = orig;
    rmSync(dir, { recursive: true, force: true });
  }
  const text = logs.join("\n");
  assert.equal(cleaned, true);
  assert.equal(installs, 0);
  assert.match(text, /validated clean packed candidate/i);
  assert.match(text, /no install was run/i);
  assert.doesNotMatch(text, /permission profile|MCP/i);
});

test("main: dry-run stops before packing when Copilot is unavailable", () => {
  let packed = false;
  const original = console.error;
  console.error = () => {};
  try {
    assert.equal(main(["install", "--dry-run"], {
      doctor: () => ({ copilot: null }),
      cleanPackedDir: () => { packed = true; },
    }), 1);
  } finally {
    console.error = original;
  }
  assert.equal(packed, false);
});

test("main: local-path install uses the validated packed candidate and always cleans up", () => {
  const dir = packedCandidate();
  const calls = [];
  let cleaned = false;
  const original = console.log;
  console.log = () => {};
  try {
    assert.equal(main(["install"], {
      doctor: () => ({ copilot: "GitHub Copilot CLI 1.0.70." }),
      cleanPackedDir: () => ({ dir, cleanup: () => { cleaned = true; rmSync(dir, { recursive: true, force: true }); } }),
      execFileSync: (command, args) => calls.push([command, ...args]),
    }), 0);
  } finally {
    console.log = original;
    rmSync(dir, { recursive: true, force: true });
  }
  assert.deepEqual(calls, [["copilot", "plugin", "install", dir]]);
  assert.equal(cleaned, true);
});

test("main: install failure never recommends the cleaned temporary package path", () => {
  const dir = packedCandidate();
  const errors = [];
  let cleaned = false;
  const originalError = console.error;
  const originalLog = console.log;
  console.error = (...args) => errors.push(args.join(" "));
  console.log = () => {};
  try {
    assert.equal(main(["install"], {
      doctor: () => ({ copilot: "GitHub Copilot CLI 1.0.70." }),
      cleanPackedDir: () => ({ dir, cleanup: () => { cleaned = true; rmSync(dir, { recursive: true, force: true }); } }),
      execFileSync: () => { throw new Error("install rejected"); },
    }), 1);
  } finally {
    console.error = originalError;
    console.log = originalLog;
    rmSync(dir, { recursive: true, force: true });
  }
  const message = errors.join("\n");
  assert.equal(cleaned, true);
  assert.doesNotMatch(message, new RegExp(dir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(message, /rerun `csw install`/i);
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
