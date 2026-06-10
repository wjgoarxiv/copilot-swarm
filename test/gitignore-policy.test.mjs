import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const localStateDir = ".o" + "mo";
const stateFile = "bou" + "lder.json";

function git(args) {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    stderr: "pipe",
  });
}

test("internal agent-state artifacts are ignored by git", () => {
  const output = git(["check-ignore", "-v", `${localStateDir}/${stateFile}`]);
  assert.match(output, new RegExp(`^\\.gitignore:\\d+:\\.o\\[m\\]o/\\t${localStateDir}/${stateFile}$`, "m"));
});

test("local-only sensitive work artifacts stay ignored by git", () => {
  for (const path of [
    "HANDOFF.md",
    ".csw/ledger.jsonl",
    ".csw-qa/m8-ptu-payload.json",
    "# REFERENCE/package.json",
  ]) {
    assert.notEqual(git(["check-ignore", "-v", path]).trim(), "", `${path} must be ignored`);
  }
});
