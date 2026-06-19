import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(repoRoot, p), "utf8");

test("published version has a dated changelog entry", () => {
  const pkg = JSON.parse(read("package.json"));
  const changelog = read("CHANGELOG.md");
  assert.match(changelog, new RegExp(`^## \\[${pkg.version.replaceAll(".", "\\.")}\\] - \\d{4}-\\d{2}-\\d{2}$`, "m"));
  assert.doesNotMatch(changelog, new RegExp(`^## \\[${pkg.version.replaceAll(".", "\\.")}\\] - unreleased$`, "m"));
});

test("package allowlist includes the awesome-copilot manifest", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.ok(pkg.files.includes(".github/plugin"));
});
