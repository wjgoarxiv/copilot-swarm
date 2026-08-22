import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { auditSkillPackages, renderMarkdown } from "../scripts/audit-skill-depth.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function withFixture(files, callback) {
  const root = mkdtempSync(join(tmpdir(), "csw-skill-audit-"));
  try {
    for (const [path, text] of Object.entries(files)) {
      const target = join(root, path);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, text);
    }
    return callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("audit follows recursive Markdown routes and rejects orphan, broken, and escaping links", () => {
  withFixture(
    {
      "skills/demo/SKILL.md": "---\nname: demo\n---\n\n[Router](references/router.md)\n",
      "skills/demo/references/router.md": [
        "# Router",
        "",
        "[Reachable leaf](deep/leaf.md)",
        "[Broken leaf](deep/missing.md)",
        "[Escape](../../../outside.md)",
        "",
      ].join("\n"),
      "skills/demo/references/deep/leaf.md": "# Leaf\n\nA sufficiently concrete operational paragraph for graph coverage.\n",
      "skills/demo/references/deep/orphan.md": "# Orphan\n",
    },
    (root) => {
      const report = auditSkillPackages(root);
      const demo = report.packages[0];

      assert.equal(demo.reachableReferenceFiles, 2);
      assert.equal(demo.maxReferenceDepth, 2);
      assert.ok(report.issues.includes("demo: unreachable reference deep/orphan.md"));
      assert.ok(report.issues.includes("demo: broken local link references/deep/missing.md"));
      assert.ok(report.issues.includes("demo: local link escapes skill root ../../../outside.md"));
    },
  );
});

test("audit reports LLM-usable content signals and Copilot CLI compatibility violations", () => {
  withFixture(
    {
      "skills/demo/SKILL.md": [
        "---",
        "name: demo",
        "---",
        "",
        "# Demo",
        "",
        "- [ ] Verify the result",
        "",
        "```sh",
        "echo ok",
        "```",
        "",
        "Call background_output(task_id) after task(subagent_type=\"explorer\").",
        "Then run csw-runtime verify --id C001 -- echo ok.",
        "",
      ].join("\n"),
    },
    (root) => {
      const report = auditSkillPackages(root);
      const demo = report.packages[0];

      assert.ok(demo.words >= 6);
      assert.equal(demo.headings, 1);
      assert.equal(demo.codeFences, 1);
      assert.equal(demo.checklistItems, 1);
      assert.ok(report.issues.some((issue) => issue.includes("foreign orchestration API background_output(")));
      assert.ok(report.issues.some((issue) => issue.includes("foreign orchestration API task(subagent_type")));
      assert.ok(report.issues.some((issue) => issue.includes("bare runtime command")));
    },
  );
});

test("audit rejects repeated long-form padding across reference files", () => {
  const repeated = "This deliberately repeated operational paragraph is long enough to look substantial while adding no new decision, procedure, failure boundary, or evidence value to the skill package.";
  withFixture(
    {
      "skills/demo/SKILL.md": "---\nname: demo\n---\n\n[A](references/a.md) [B](references/b.md) [C](references/c.md)\n",
      "skills/demo/references/a.md": `# A\n\n${repeated}\n`,
      "skills/demo/references/b.md": `# B\n\n${repeated}\n`,
      "skills/demo/references/c.md": `# C\n\n${repeated}\n`,
    },
    (root) => {
      const report = auditSkillPackages(root);

      assert.ok(report.issues.some((issue) => issue.includes("repeated long paragraph in 3 files")));
      assert.ok(report.totals.uniqueParagraphRatio < 0.5);
    },
  );
});

test("all 15 skill packages clear the source-parity depth floor without graph or compatibility defects", () => {
  const report = auditSkillPackages(repoRoot);

  assert.deepEqual(report.issues, []);
  assert.equal(report.totals.skills, 15);
  assert.ok(report.totals.mainLines >= 2_800, `main bodies too shallow: ${report.totals.mainLines}`);
  assert.ok(report.totals.referenceFiles >= 140, `too few practical references: ${report.totals.referenceFiles}`);
  assert.ok(report.totals.referenceLines >= 28_000, `references too shallow: ${report.totals.referenceLines}`);
  assert.ok(report.totals.totalLines >= 32_300, `suite below source parity: ${report.totals.totalLines}`);
  assert.ok(report.totals.words >= 100_000, `suite lacks explanatory density: ${report.totals.words} words`);
  assert.ok(report.totals.codeFences >= 350, `suite lacks executable examples: ${report.totals.codeFences}`);
  assert.ok(report.totals.uniqueParagraphRatio >= 0.97, `suite contains repeated long-form padding: ${report.totals.uniqueParagraphRatio}`);

  const packageFloors = {
    "csw-programming": 17_000,
    "csw-debugging": 3_700,
    "csw-lsp": 1_900,
    "csw-refactor": 1_300,
    "csw-review": 1_700,
    "csw-visual-qa": 1_700,
    "csw-deslop": 1_100,
  };
  for (const [name, floor] of Object.entries(packageFloors)) {
    const item = report.packages.find((candidate) => candidate.name === name);
    assert.ok(item, `${name}: package missing`);
    assert.ok(item.totalLines >= floor, `${name}: ${item.totalLines} lines below ${floor}`);
  }

  for (const item of report.packages) {
    assert.ok(item.mainLines >= 150, `${item.name}: main body below 150 lines`);
    assert.ok(item.totalLines >= 480, `${item.name}: package below 480 lines`);
    assert.equal(item.reachableReferenceFiles, item.referenceFiles, `${item.name}: graph coverage drift`);
  }
});

test("skill depth audit renders a complete reproducible report", () => {
  const report = auditSkillPackages(repoRoot);
  const markdown = renderMarkdown(report);

  assert.match(markdown, /# Skill depth audit/);
  assert.match(markdown, /\| \*\*Total\*\*/);
  assert.match(markdown, /Issues: 0/);
  for (const item of report.packages) assert.match(markdown, new RegExp(`\\| ${item.name} \\|`));
});
