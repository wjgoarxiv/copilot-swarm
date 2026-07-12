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
  for (const s of ["swarm", "csw-plan", "csw-work", "csw-review", "csw-loop"]) {
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
        assert.match(text, new RegExp(`\\[[^\\]]+\\]\\(references/${rf.replaceAll(".", "\\.")}\\)`), `${d}/references/${rf}: must be reachable through a Markdown link from SKILL.md`);
      }
    }
  }
});

test("native-first package has no custom MCP dispatcher", () => {
  assert.equal(existsSync(join(repoRoot, ".mcp.json")), false);
  assert.equal(existsSync(join(repoRoot, "mcp/dispatch/server.mjs")), false);
  assert.equal(existsSync(join(repoRoot, "mcp/dispatch/dispatch-core.mjs")), false);
  const manifest = JSON.parse(readFileSync(join(repoRoot, ".plugin/plugin.json"), "utf8"));
  assert.equal(manifest.mcpServers, undefined);
});

test("native-first skills use host scheduling, machine receipts, and enforced isolation", () => {
  const swarm = readFileSync(join(repoRoot, "skills/swarm/SKILL.md"), "utf8");
  assert.match(swarm, /host `task` subagent tool/);
  assert.match(swarm, /\/fleet/);
  assert.match(swarm, /\/tasks/);
  assert.match(swarm, /deny\/available-tool policy/);
  assert.match(swarm, /separate git worktree/);
  assert.match(swarm, /claim, not evidence/i);

  for (const skill of ["csw-work", "csw-loop", "csw-review"]) {
    const text = readFileSync(join(repoRoot, "skills", skill, "SKILL.md"), "utf8");
    assert.match(text, /csw-runtime(?:\.mjs)? verify --id/);
    assert.match(text, /csw-runtime(?:\.mjs)? artifact --id/);
    assert.match(text, /Free-text evidence\s+cannot\s+pass/i);
  }

  const planReference = readFileSync(join(repoRoot, "skills/csw-plan/references/full-workflow.md"), "utf8");
  assert.match(planReference, /csw-runtime\.mjs verify --id/);
  assert.match(planReference, /csw-runtime\.mjs artifact --id/);

  for (const text of [
    readFileSync(join(repoRoot, "skills/csw-work/SKILL.md"), "utf8"),
    readFileSync(join(repoRoot, "skills/csw-loop/SKILL.md"), "utf8"),
    planReference,
  ]) {
    assert.match(text, /trusted-command runner, not a sandbox/i);
    assert.match(text, /malicious same-user\s+editor/i);
    assert.match(text, /non-git(?:\s+`verify` receipts?|\s+verification) ha(?:s|ve)\s+no workspace-freshness\s+guarantee/i);
    assert.match(text, /worker output[\s\S]*fetched pages[\s\S]*issue\s+text[\s\S]*prompt-injected\s+content/i);
    assert.match(text, /tracked and non-ignored\s+untracked/i);
    assert.match(text, /ignored inputs[\s\S]*`artifact` receipts/i);
    assert.match(text, /approved,\s+non-daemonizing/i);
    assert.match(text, /timeout\/cancel process-tree cleanup is\s+best-effort/i);
    assert.match(text, /daemonized commands may outlive it/i);
    assert.match(text, /cleanup receipt/i);
  }
});

test("planning surfaces agree on generate, review, then approval before execution", () => {
  const plan = readFileSync(join(repoRoot, "skills/csw-plan/SKILL.md"), "utf8");
  assert.ok(plan.indexOf("Generate ONE plan") < plan.indexOf("Gap analysis + plan review"));
  assert.ok(plan.indexOf("Gap analysis + plan review") < plan.indexOf("Approval gate (HARD STOP)"));
  for (const file of ["README.md", "README-Ko-KR.md", "skills/csw-loop/SKILL.md"]) {
    const text = readFileSync(join(repoRoot, file), "utf8");
    assert.match(text, /plan|계획/i);
    assert.match(text, /review|검토/i);
    assert.match(text, /approval gate|승인 게이트/i);
  }
});

test("investigation and review agents require host-enforced non-mutating tools", () => {
  for (const name of ["explorer", "researcher", "gap-analyst", "plan-reviewer", "verifier"]) {
    const text = readFileSync(join(repoRoot, "agents", `${name}.agent.md`), "utf8");
    assert.match(text, /host (?:deny\/available-tool )?policy|host-enforced non-mutating/i, name);
    assert.match(text, /not (?:a )?(?:security boundary|enforcement)|do(?:es)? not enforce/i, name);
  }
});
