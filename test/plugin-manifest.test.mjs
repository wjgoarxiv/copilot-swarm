import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { scanText } from "../scripts/scanner-core.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(repoRoot, p), "utf8");

test("plugin manifest exists at the primary lookup location", () => {
  assert.ok(existsSync(join(repoRoot, ".plugin/plugin.json")), ".plugin/plugin.json must exist");
});

test("plugin manifest is valid JSON with required identity fields", () => {
  const m = JSON.parse(read(".plugin/plugin.json"));
  assert.equal(m.name, "copilot-swarm");
  assert.match(m.name, /^[a-z0-9][a-z0-9-]*$/, "name must be kebab-case");
  assert.equal(m.version, "0.1.0");
  assert.match(m.version, /^\d+\.\d+\.\d+$/, "version must be semver");
  assert.ok(typeof m.description === "string" && m.description.length > 0);
});

test("plugin manifest component pointers resolve to real targets", () => {
  const m = JSON.parse(read(".plugin/plugin.json"));
  const resolveDir = (rel) => {
    const p = join(repoRoot, rel);
    assert.ok(existsSync(p) && statSync(p).isDirectory(), `${rel} must be a directory`);
  };
  const resolveFile = (rel) => {
    const p = join(repoRoot, rel);
    assert.ok(existsSync(p) && statSync(p).isFile(), `${rel} must be a file`);
  };
  if (m.skills) resolveDir(m.skills);
  if (m.agents) resolveDir(m.agents);
  if (m.hooks) resolveFile(typeof m.hooks === "string" ? m.hooks : m.hooks.paths[0]);
  if (m.mcpServers) resolveFile(m.mcpServers);
});

test("hooks.json and .mcp.json are valid JSON with expected shape", () => {
  const hooks = JSON.parse(read("hooks/hooks.json"));
  assert.equal(typeof hooks.hooks, "object");
  const mcp = JSON.parse(read(".mcp.json"));
  assert.equal(typeof mcp.mcpServers, "object");
});

test("plugin manifest and skeleton config are token-clean", () => {
  for (const f of [".plugin/plugin.json", "hooks/hooks.json", ".mcp.json", "AGENTS.md"]) {
    assert.deepEqual(scanText(read(f)), [], `${f} must be token-clean`);
  }
});
