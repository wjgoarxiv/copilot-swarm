import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { SERVER_INFO } from "../mcp/dispatch/server.mjs";
import { runReleaseCheck, packFiles } from "../scripts/release-check.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(repoRoot, p), "utf8");
const readJson = (p) => JSON.parse(read(p));

test("release versions stay in lockstep across package, plugin, MCP, changelog, and README", () => {
  const pkg = readJson("package.json");
  assert.equal(readJson(".plugin/plugin.json").version, pkg.version);
  assert.equal(readJson(".github/plugin/plugin.json").version, pkg.version);
  assert.equal(SERVER_INFO.version, pkg.version);
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
});

test("release-check script reports clean preflight", () => {
  const result = runReleaseCheck(repoRoot);
  assert.equal(result.ok, true, result.errors.join("\n"));
});
