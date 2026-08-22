import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { scanText } from "../scripts/scanner-core.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(repoRoot, p), "utf8");
const primaryManifestPath = ".plugin/plugin.json";
const awesomeCopilotManifestPath = ".github/plugin/plugin.json";
const readJson = (p) => JSON.parse(read(p));

test("plugin manifest exists at the primary lookup location", () => {
  assert.ok(existsSync(join(repoRoot, primaryManifestPath)), ".plugin/plugin.json must exist");
});

test("plugin manifest exists at an awesome-copilot external plugin lookup location", () => {
  assert.ok(
    existsSync(join(repoRoot, awesomeCopilotManifestPath)),
    ".github/plugin/plugin.json must exist for awesome-copilot external plugin intake",
  );
});

test("plugin manifest is valid JSON with required identity fields", () => {
  const m = readJson(primaryManifestPath);
  const pkg = readJson("package.json");
  assert.equal(m.name, "copilot-swarm");
  assert.match(m.name, /^[a-z0-9][a-z0-9-]*$/, "name must be kebab-case");
  assert.equal(m.version, pkg.version);
  assert.match(m.version, /^\d+\.\d+\.\d+$/, "version must be semver");
  assert.ok(typeof m.description === "string" && m.description.length > 0);
  assert.match(m.description, /evidence-gated/i);
  assert.match(m.description, /native/i);
  assert.doesNotMatch(m.description, /^Parallel task delegation/i);
});

test("metadata distinguishes the native substrate from durable completion governance", () => {
  const pkg = readJson("package.json");
  const primary = readJson(primaryManifestPath);
  const github = readJson(awesomeCopilotManifestPath);
  for (const manifest of [pkg, primary, github]) {
    assert.match(manifest.description, /durable/i);
    assert.match(manifest.description, /evidence-gated/i);
    assert.match(manifest.description, /completion/i);
    assert.match(manifest.description, /native task, fleet.*execution substrate/i);
    assert.ok(manifest.keywords.includes("durable-ledger"));
    assert.ok(manifest.keywords.includes("evidence-gated-completion"));
  }
  assert.deepEqual(primary.keywords, github.keywords);
});

test("awesome-copilot manifest stays synchronized with the primary manifest", () => {
  assert.deepEqual(readJson(awesomeCopilotManifestPath), readJson(primaryManifestPath));
});

test("plugin manifest component pointers resolve to real targets", () => {
  const m = readJson(primaryManifestPath);
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
  assert.equal(m.mcpServers, undefined, "native-first plugin must not register a custom MCP server");
});

test("hooks.json is valid JSON and legacy MCP config is absent", () => {
  const hooks = JSON.parse(read("hooks/hooks.json"));
  assert.equal(typeof hooks.hooks, "object");
  assert.equal(existsSync(join(repoRoot, ".mcp.json")), false);
});

test("plugin manifest and hook config are token-clean", () => {
  for (const f of [primaryManifestPath, awesomeCopilotManifestPath, "hooks/hooks.json", "AGENTS.md"]) {
    assert.deepEqual(scanText(read(f)), [], `${f} must be token-clean`);
  }
});
