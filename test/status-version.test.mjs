import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { doctor, statusReport, main } from "../bin/csw.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourceVersion = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")).version;

function probe(pluginList) {
  return doctor((cmd) => cmd[1] === "--version"
    ? { ok: true, out: "GitHub Copilot CLI 1.0.60\n" }
    : { ok: true, out: pluginList });
}

test("doctor reports matching source and installed plugin versions", () => {
  const d = probe(`Installed plugins:\n  copilot-swarm (v${sourceVersion})\n`);
  assert.deepEqual(
    { sourceVersion: d.sourceVersion, installedVersion: d.installedVersion, versionMatches: d.versionMatches },
    { sourceVersion, installedVersion: sourceVersion, versionMatches: true },
  );
  assert.match(statusReport(d, false), new RegExp(`installed v${sourceVersion.replaceAll(".", "\\.")} — version matches source`));
});

test("status visibly warns when the installed plugin version mismatches", () => {
  const d = probe("copilot-swarm (v9.9.9)\n");
  assert.equal(d.installedVersion, "9.9.9");
  assert.equal(d.versionMatches, false);
  const report = statusReport(d, false);
  assert.match(report, /VERSION MISMATCH/);
  assert.match(report, /source v/);
  assert.doesNotMatch(report, /\[ok\] copilot-swarm plugin/);
});

test("status visibly warns instead of false-green when installed version is unknown", () => {
  const d = probe("Installed plugins:\n  copilot-swarm\n");
  assert.equal(d.pluginInstalled, true);
  assert.equal(d.installedVersion, null);
  assert.equal(d.versionMatches, null);
  const report = statusReport(d, false);
  assert.match(report, /VERSION UNKNOWN/);
  assert.doesNotMatch(report, /\[ok\] copilot-swarm plugin/);
});

test("doctor parses only an exact copilot-swarm plugin entry", () => {
  const d = probe([
    "not-copilot-swarm (v8.8.8)",
    "copilot-swarm-helper (v7.7.7)",
    "/tmp/copilot-swarm-6.6.6",
  ].join("\n"));
  assert.equal(d.pluginListOk, true);
  assert.equal(d.pluginInstalled, false);
  assert.equal(d.installedVersion, null);
  assert.equal(d.versionMatches, null);
});

test("doctor does not mistake a path semver for the exact plugin entry version", () => {
  const d = probe("  • copilot-swarm (/tmp/copilot-swarm-9.9.9)\n");
  assert.equal(d.pluginInstalled, true);
  assert.equal(d.installedVersion, null);
  assert.equal(d.versionMatches, null);
});

test("doctor distinguishes plugin-list probe failure from confirmed absence", () => {
  const failed = doctor((cmd) => cmd[1] === "--version"
    ? { ok: true, out: "GitHub Copilot CLI 1.0.70.\n" }
    : { ok: false, out: `copilot-swarm (v${sourceVersion})` });
  assert.equal(failed.pluginListOk, false);
  assert.equal(failed.pluginInstalled, null);
  assert.equal(failed.versionMatches, null);
  assert.match(statusReport(failed, false), /PLUGIN LIST UNAVAILABLE/);

  const absent = probe("Installed plugins:\n");
  assert.equal(absent.pluginListOk, true);
  assert.equal(absent.pluginInstalled, false);
});

test("status exits zero only for an exact version match", () => {
  const original = console.log;
  console.log = () => {};
  try {
    const base = { node: "v22", copilot: "cli", pluginListOk: true, pluginInstalled: true, sourceVersion, installedVersion: sourceVersion, versionMatches: true };
    assert.equal(main(["status"], { doctor: () => base }), 0);
    assert.equal(main(["status"], { doctor: () => ({ ...base, installedVersion: "9.9.9", versionMatches: false }) }), 1);
    assert.equal(main(["status"], { doctor: () => ({ ...base, installedVersion: null, versionMatches: null }) }), 1);
    assert.equal(main(["status"], { doctor: () => ({ ...base, pluginListOk: true, pluginInstalled: false, installedVersion: null, versionMatches: null }) }), 1);
    assert.equal(main(["status"], { doctor: () => ({ ...base, pluginListOk: false, pluginInstalled: null, installedVersion: null, versionMatches: null }) }), 1);
  } finally {
    console.log = original;
  }
});
