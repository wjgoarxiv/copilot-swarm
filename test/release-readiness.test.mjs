import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runReleaseCheck, packFiles, activeTextViolations, registryVersion } from "../scripts/release-check.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(repoRoot, p), "utf8");
const readJson = (p) => JSON.parse(read(p));

test("release versions stay in lockstep across package, plugin, changelog, and README", () => {
  const pkg = readJson("package.json");
  assert.equal(readJson(".plugin/plugin.json").version, pkg.version);
  assert.equal(readJson(".github/plugin/plugin.json").version, pkg.version);
  assert.match(read("CHANGELOG.md"), new RegExp(`^## \\[${pkg.version.replaceAll(".", "\\.")}\\] - \\d{4}-\\d{2}-\\d{2}$`, "m"));
  assert.match(read("README.md"), new RegExp(`copilot-swarm-${pkg.version.replaceAll(".", "\\.")}\\.tgz`));
  assert.match(read("README-Ko-KR.md"), new RegExp(`copilot-swarm-${pkg.version.replaceAll(".", "\\.")}\\.tgz`));
});

test("npm dry-run package includes README-linked local docs/assets and excludes private artifacts", () => {
  const files = new Set(packFiles(repoRoot));
  for (const required of ["README.md", "README-Ko-KR.md", "cover.png", "docs/supporting-components.md", "docs/release-checklist.md", "docs/permission-profiles.md"]) {
    assert.ok(files.has(required), `${required} must ship in npm payload`);
  }
  for (const forbidden of [".csw/", ".csw-qa/", "." + "om" + "o/", ".litopen" + "code/", "plans/", "HANDOFF.md", "# REFERENCE/"]) {
    assert.ok([...files].every((f) => !f.startsWith(forbidden)), `${forbidden} must not ship`);
  }
  for (const removed of [".mcp.json", "mcp/"]) {
    assert.ok([...files].every((f) => f !== removed && !f.startsWith(removed)), `${removed} must not ship`);
  }
});

test("packed active docs and skills contain no removed dispatcher language", () => {
  const violations = activeTextViolations(packFiles(repoRoot), repoRoot);
  assert.equal(violations.some((item) => item.startsWith("CHANGELOG.md:")), false, "historical changelog text is not active guidance");
  assert.deepEqual(violations, []);
});

test("CHANGELOG guard rejects removed language in Unreleased", () => {
  const cwd = mkdtempSync(join(tmpdir(), "csw-changelog-"));
  try {
    writeFileSync(join(cwd, "CHANGELOG.md"), "# Changelog\n\n## [Unreleased]\n\ncsw-dispatch\n\n## [0.1.0] - 2026-01-01\n\nclean history\n");
    assert.deepEqual(activeTextViolations(["CHANGELOG.md"], cwd), ["CHANGELOG.md: removed active text csw-dispatch"]);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("CHANGELOG guard exempts removed language in dated history", () => {
  const cwd = mkdtempSync(join(tmpdir(), "csw-changelog-"));
  try {
    writeFileSync(join(cwd, "CHANGELOG.md"), "# Changelog\n\n## [Unreleased]\n\nCurrent native behavior.\n\n## [0.1.0] - 2026-01-01\n\ncsw-dispatch\n");
    assert.deepEqual(activeTextViolations(["CHANGELOG.md"], cwd), []);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("release-check script reports clean preflight", () => {
  const result = runReleaseCheck(repoRoot);
  assert.equal(result.ok, true, result.errors.join("\n"));
});

test("publish preflight rejects a version that already exists in the registry", () => {
  const result = runReleaseCheck(repoRoot, { publishedVersion: readJson("package.json").version });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /already published/);
});

test("publish preflight accepts a version absent from the registry", () => {
  const result = runReleaseCheck(repoRoot, { publishedVersion: null });
  assert.equal(result.ok, true, result.errors.join("\n"));
});

test("registry publish probe queries the exact candidate version", () => {
  let argv;
  const found = registryVersion("0.1.0", (_command, args) => {
    argv = args;
    return "0.1.0\n";
  });
  assert.equal(found, "0.1.0");
  assert.deepEqual(argv, ["view", "copilot-swarm@0.1.0", "version"]);
});

test("registry publish probe accepts only explicit not-found and fails closed otherwise", () => {
  assert.equal(registryVersion("9.9.9", () => {
    const error = new Error("registry miss");
    error.stderr = "npm ERR! code E404\nnpm ERR! 404 Not Found";
    throw error;
  }), null);
  assert.equal(registryVersion("9.9.9", () => {
    const error = new Error("registry miss");
    error.stderr = "npm error code E404\nnpm error 404 No match found for version 9.9.9";
    throw error;
  }), null);
  assert.throws(() => registryVersion("9.9.9", () => {
    throw new Error("network timeout");
  }), /refusing publish preflight/);
  assert.throws(() => registryVersion("9.9.9", () => {
    throw new Error("upstream gateway returned 404 Not Found");
  }), /refusing publish preflight/);
  assert.throws(() => registryVersion("9.9.9", () => "8.8.8\n"), /refusing publish preflight/);
});
