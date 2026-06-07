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

test("every skill has valid frontmatter (name == dir), is token-clean, and references resolve", () => {
  const skillsDir = join(repoRoot, "skills");
  const dirs = readdirSync(skillsDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  for (const s of ["swarm", "csw-plan", "csw-work", "csw-review"]) {
    assert.ok(dirs.includes(s), `expected skill: ${s}`);
  }
  for (const d of dirs) {
    const p = join(skillsDir, d, "SKILL.md");
    assert.ok(existsSync(p), `${d}/SKILL.md must exist`);
    const text = readFileSync(p, "utf8");
    const fm = frontmatter(text);
    assert.ok(fm, `${d}: missing frontmatter`);
    assert.equal(fm.name, d, `${d}: skill name must match directory`);
    assert.ok(fm.description && fm.description.length > 20, `${d}: description required`);
    assert.deepEqual(scanText(text), [], `${d}: SKILL.md must be token-clean`);
    // referenced reference files (references/*.md) must exist and be token-clean
    const refDir = join(skillsDir, d, "references");
    if (existsSync(refDir)) {
      for (const rf of readdirSync(refDir)) {
        assert.deepEqual(scanText(readFileSync(join(refDir, rf), "utf8")), [], `${d}/references/${rf}: token-clean`);
      }
    }
  }
});

test(".mcp.json registers csw-dispatch pointing at the bundled server", () => {
  const mcp = JSON.parse(readFileSync(join(repoRoot, ".mcp.json"), "utf8"));
  const srv = mcp.mcpServers["csw-dispatch"];
  assert.ok(srv, "csw-dispatch server must be registered");
  assert.equal(srv.command, "node");
  assert.ok(srv.args.some((a) => a.includes("mcp/dispatch/server.mjs")), "must point at server.mjs");
});
