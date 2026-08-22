import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const hook = join(repoRoot, "hooks/failure-guide.mjs");

test("failure guide returns static recovery context without echoing untrusted errors", async () => {
  assert.ok(existsSync(hook), "failure-guide hook must exist");
  const { guidanceFor } = await import(pathToFileURL(hook));
  const marker = "sensitive-error-marker";
  const guidance = guidanceFor({ toolName: "bash", error: marker });
  assert.match(guidance, /root cause/i);
  assert.match(guidance, /copilot-swarm:csw-debugging/);
  assert.doesNotMatch(guidance, new RegExp(marker));
  assert.equal(guidanceFor({ toolName: "bash" }), null);
});

test("failure guide hook uses Copilot postToolUseFailure warning semantics", async () => {
  assert.ok(existsSync(hook), "failure-guide hook must exist");
  const result = await new Promise((resolve) => {
    const child = spawn(process.execPath, [hook], { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.on("close", (code) => resolve({ code, stdout }));
    child.stdin.end(JSON.stringify({ toolName: "bash", error: "command failed" }));
  });
  assert.equal(result.code, 2);
  assert.match(result.stdout, /copilot-swarm:csw-debugging/);
});

test("hooks.json registers the failure guide on postToolUseFailure", () => {
  const config = JSON.parse(readFileSync(join(repoRoot, "hooks/hooks.json"), "utf8"));
  assert.ok(Array.isArray(config.hooks.postToolUseFailure));
  assert.match(config.hooks.postToolUseFailure[0].bash, /failure-guide\.mjs/);
});
