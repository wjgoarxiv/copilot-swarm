import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { scanText } from "../scripts/scanner-core.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function frontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const fields = {};
  for (const line of m[1].split("\n")) {
    const mm = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (mm) fields[mm[1]] = mm[2].trim();
  }
  return fields;
}

const EXPECTED_AGENTS = ["explorer", "researcher", "planner", "gap-analyst", "plan-reviewer", "verifier"];

test("agent roster: all expected workers exist as .agent.md", () => {
  const dir = join(repoRoot, "agents");
  const files = readdirSync(dir).filter((f) => f.endsWith(".agent.md"));
  const names = files.map((f) => f.replace(/\.agent\.md$/, "")).sort();
  assert.deepEqual(names, [...EXPECTED_AGENTS].sort());
});

test("each agent has valid frontmatter (name matches filename, description present) and is token-clean", () => {
  const dir = join(repoRoot, "agents");
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".agent.md"))) {
    const text = readFileSync(join(dir, f), "utf8");
    const fm = frontmatter(text);
    assert.ok(fm, `${f}: missing frontmatter`);
    assert.equal(fm.name, basename(f, ".agent.md"), `${f}: name must match filename`);
    assert.ok(fm.description && fm.description.length > 10, `${f}: description required`);
    assert.deepEqual(scanText(text), [], `${f}: must be token-clean`);
  }
});

test("swarm skill exists with valid frontmatter and is token-clean", () => {
  const p = join(repoRoot, "skills/swarm/SKILL.md");
  assert.ok(existsSync(p), "skills/swarm/SKILL.md must exist");
  const text = readFileSync(p, "utf8");
  const fm = frontmatter(text);
  assert.equal(fm.name, "swarm");
  assert.ok(fm.description.length > 10);
  assert.deepEqual(scanText(text), [], "swarm skill must be token-clean");
});

test(".mcp.json registers csw-dispatch pointing at the bundled server", () => {
  const mcp = JSON.parse(readFileSync(join(repoRoot, ".mcp.json"), "utf8"));
  const srv = mcp.mcpServers["csw-dispatch"];
  assert.ok(srv, "csw-dispatch server must be registered");
  assert.equal(srv.command, "node");
  assert.ok(srv.args.some((a) => a.includes("mcp/dispatch/server.mjs")), "must point at server.mjs");
});
