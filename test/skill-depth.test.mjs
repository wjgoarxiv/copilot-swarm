import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { scanText } from "../scripts/scanner-core.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const CORE_SKILLS = {
  "csw-programming": {
    mainLines: 180,
    referenceLines: 600,
    references: [
      "architecture-and-size.md",
      "go.md",
      "python.md",
      "rust.md",
      "security-boundaries.md",
      "testing-strategy.md",
      "typescript.md",
    ],
    concepts: [/language gate/i, /test pyramid/i, /pure LOC/i, /real user scenario/i, /Copilot CLI/i],
  },
  "csw-debugging": {
    mainLines: 160,
    referenceLines: 450,
    references: [
      "evidence-and-escalation.md",
      "investigation-phases.md",
      "runtime-playbook.md",
      "tool-selection.md",
    ],
    concepts: [/triage/i, /competing hypotheses/i, /runtime/i, /escalation/i, /root cause/i, /cleanup/i],
  },
  "csw-refactor": {
    mainLines: 180,
    referenceLines: 350,
    references: ["codemap-template.md", "decision-and-pattern-playbook.md", "execution-and-recovery.md", "language-and-runtime-checklists.md", "verification-strategy.md", "worker-packets-and-integration.md"],
    concepts: [/intent gate/i, /codemap/i, /impact zones/i, /characterization/i, /rollback/i, /checkpoint/i],
  },
  "csw-deslop": {
    mainLines: 150,
    referenceLines: 300,
    references: ["behavior-lock.md", "cleanup-casebook-and-reporting.md", "language-specific-cleanup.md", "module-boundary-triage.md", "performance-and-behavior-equivalence.md", "review-rubric.md", "smell-catalog.md"],
    concepts: [/scope/i, /behavior lock/i, /smell catalog/i, /quality gates/i, /review rubric/i],
  },
};

const PRODUCT_SKILLS = {
  "csw-frontend": {
    mainLines: 140,
    referenceLines: 300,
    references: ["accessibility-and-responsive.md", "design-system-audit.md", "visual-delivery-checklist.md"],
    concepts: [/design system audit/i, /information hierarchy/i, /interaction states/i, /responsive/i, /accessibility/i],
  },
  "csw-git": {
    mainLines: 140,
    referenceLines: 300,
    references: ["commit-strategy.md", "history-and-recovery.md", "rebase-safety.md"],
    concepts: [/mode gate/i, /commit planning/i, /history investigation/i, /rebase/i, /recovery/i],
  },
  "csw-init": {
    mainLines: 170,
    referenceLines: 400,
    references: ["agents-templates.md", "instruction-scoring.md", "repository-discovery.md"],
    concepts: [/discovery/i, /scoring/i, /ownership boundaries/i, /hierarchy/i, /deduplic/i],
  },
  "csw-interview": {
    mainLines: 170,
    referenceLines: 400,
    references: ["ambiguity-model.md", "brief-and-handoff.md", "question-strategy.md"],
    concepts: [/depth profile/i, /ambiguity/i, /one question/i, /challenge mode/i, /decision boundaries/i],
  },
  "csw-lsp": {
    mainLines: 150,
    referenceLines: 400,
    references: ["configuration-and-roots.md", "diagnostics-and-troubleshooting.md", "native-operation-catalog.md", "native-schema-and-lifecycle.md", "server-matrix.md", "verification-scenarios.md"],
    concepts: [/language gate/i, /project boundary/i, /initialization/i, /diagnostics/i, /semantic operation/i],
  },
  "csw-visual-qa": {
    mainLines: 160,
    referenceLines: 400,
    references: ["capture-matrix.md", "objective-comparison.md", "reviewer-packets.md", "tui-and-cjk-review.md", "verdict-template.md", "visual-counterexamples.md", "web-review.md"],
    concepts: [/capture matrix/i, /reference fidelity/i, /interaction/i, /CJK/i, /verdict/i],
  },
};

const ORCHESTRATION_SKILLS = {
  "csw-loop": {
    mainLines: 140,
    referenceLines: 250,
    references: ["full-workflow.md"],
    concepts: [/bootstrap/i, /approval gate/i, /PIN.*RED.*GREEN/i, /receipt trust boundary/i, /cleanup receipt/i, /fail-open/i],
  },
  "csw-plan": {
    mainLines: 130,
    referenceLines: 220,
    references: ["full-workflow.md"],
    concepts: [/evidence map/i, /ambiguity/i, /success criteria/i, /plan review/i, /approval gate/i, /rollback/i],
  },
  "csw-review": {
    mainLines: 170,
    referenceLines: 450,
    references: ["compliance-lanes.md", "draft-plan-review.md", "evidence-review.md", "manual-qa-and-context-mining.md", "review-worker-packets.md", "security-and-scope.md", "verdict-template.md"],
    concepts: [/compliance/i, /code quality/i, /manual QA/i, /security/i, /scope fidelity/i, /UNCONDITIONAL APPROVAL/i],
  },
  "csw-work": {
    mainLines: 150,
    referenceLines: 300,
    references: ["execution-checkpoints.md", "failure-and-resume.md"],
    concepts: [/approved plan/i, /checkpoint/i, /failure recovery/i, /rollback/i, /cleanup receipt/i, /blocker/i],
  },
  swarm: {
    mainLines: 130,
    referenceLines: 300,
    references: ["delegation-packets.md", "isolation-and-worktrees.md", "scheduling-and-failure.md"],
    concepts: [/independent/i, /native scheduling/i, /host-enforced/i, /isolated git worktree/i, /self-contained/i, /failure/i],
  },
};

function lineCount(text) {
  return text.split("\n").length - Number(text.endsWith("\n"));
}

function referenceFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((name) => statSync(join(dir, name)).isFile()).sort();
}

test("engineering core skills provide decision-complete bodies and linked practical references", () => {
  for (const [name, expected] of Object.entries(CORE_SKILLS)) {
    const dir = join(repoRoot, "skills", name);
    const mainPath = join(dir, "SKILL.md");
    const main = readFileSync(mainPath, "utf8");
    assert.ok(lineCount(main) >= expected.mainLines, `${name}: main body is too thin`);

    for (const concept of expected.concepts) {
      assert.match(main, concept, `${name}: missing operational concept ${concept}`);
    }

    const refsDir = join(dir, "references");
    const refs = referenceFiles(refsDir);
    assert.deepEqual(refs, expected.references, `${name}: reference inventory drift`);

    let totalReferenceLines = 0;
    for (const file of refs) {
      const text = readFileSync(join(refsDir, file), "utf8");
      totalReferenceLines += lineCount(text);
      assert.deepEqual(scanText(text), [], `${name}/references/${file}: source trace`);
      assert.match(main, new RegExp(`\\[[^\\]]+\\]\\(references/${file.replaceAll(".", "\\.")}\\)`), `${name}: ${file} is unreachable`);
    }
    assert.ok(totalReferenceLines >= expected.referenceLines, `${name}: references are too shallow (${totalReferenceLines})`);
  }
});

test("engineering core references contain executable checklists rather than prose-only summaries", () => {
  const required = {
    "csw-programming": [/Given/, /When/, /Then/, /boundary/, /verification command/i],
    "csw-debugging": [/observation/i, /hypothesis/i, /command/i, /exit status/i, /cleanup receipt/i],
    "csw-refactor": [/caller/i, /dependency/i, /baseline/i, /rollback/i, /real scenario/i],
    "csw-deslop": [/preserve/i, /remove/i, /risk/i, /focused test/i, /final diff/i],
  };

  for (const [name, patterns] of Object.entries(required)) {
    const refsDir = join(repoRoot, "skills", name, "references");
    const combined = referenceFiles(refsDir)
      .map((file) => readFileSync(join(refsDir, file), "utf8"))
      .join("\n");
    for (const pattern of patterns) assert.match(combined, pattern, `${name}: missing ${pattern}`);
  }
});

test("product and quality skills provide deep decision tables, templates, and edge procedures", () => {
  for (const [name, expected] of Object.entries(PRODUCT_SKILLS)) {
    const dir = join(repoRoot, "skills", name);
    const main = readFileSync(join(dir, "SKILL.md"), "utf8");
    assert.ok(lineCount(main) >= expected.mainLines, `${name}: main body is too thin`);
    for (const concept of expected.concepts) assert.match(main, concept, `${name}: missing ${concept}`);

    const refsDir = join(dir, "references");
    const refs = referenceFiles(refsDir);
    assert.deepEqual(refs, expected.references, `${name}: reference inventory drift`);
    let totalReferenceLines = 0;
    for (const file of refs) {
      const text = readFileSync(join(refsDir, file), "utf8");
      totalReferenceLines += lineCount(text);
      assert.deepEqual(scanText(text), [], `${name}/references/${file}: source trace`);
      assert.match(main, new RegExp(`\\[[^\\]]+\\]\\(references/${file.replaceAll(".", "\\.")}\\)`), `${name}: ${file} is unreachable`);
    }
    assert.ok(totalReferenceLines >= expected.referenceLines, `${name}: references are too shallow (${totalReferenceLines})`);
  }
});

test("product and quality references are actionable at malformed and real-surface boundaries", () => {
  const requirements = {
    "csw-frontend": [/keyboard/i, /empty state/i, /long content/i, /viewport/i, /evidence path/i],
    "csw-git": [/staged diff/i, /upstream/i, /conflict/i, /reflog/i, /verification/i],
    "csw-init": [/file count/i, /entry point/i, /nested/i, /template/i, /command/i],
    "csw-interview": [/weighted/i, /non-goal/i, /tradeoff/i, /acceptance/i, /handoff/i],
    "csw-lsp": [/unsupported/i, /timeout/i, /root/i, /rename/i, /diagnostic/i],
    "csw-visual-qa": [/loading/i, /error/i, /wide character/i, /motion/i, /NEEDS WORK/i],
  };
  for (const [name, patterns] of Object.entries(requirements)) {
    const refsDir = join(repoRoot, "skills", name, "references");
    const combined = referenceFiles(refsDir).map((file) => readFileSync(join(refsDir, file), "utf8")).join("\n");
    for (const pattern of patterns) assert.match(combined, pattern, `${name}: missing ${pattern}`);
  }
});

test("orchestration skills form a deep and mutually navigable execution system", () => {
  for (const [name, expected] of Object.entries(ORCHESTRATION_SKILLS)) {
    const dir = join(repoRoot, "skills", name);
    const main = readFileSync(join(dir, "SKILL.md"), "utf8");
    assert.ok(lineCount(main) >= expected.mainLines, `${name}: main body is too thin`);
    for (const concept of expected.concepts) assert.match(main, concept, `${name}: missing ${concept}`);

    const refsDir = join(dir, "references");
    const refs = referenceFiles(refsDir);
    assert.deepEqual(refs, expected.references, `${name}: reference inventory drift`);
    let totalReferenceLines = 0;
    for (const file of refs) {
      const text = readFileSync(join(refsDir, file), "utf8");
      totalReferenceLines += lineCount(text);
      assert.deepEqual(scanText(text), [], `${name}/references/${file}: source trace`);
      assert.match(main, new RegExp(`\\[[^\\]]+\\]\\(references/${file.replaceAll(".", "\\.")}\\)`), `${name}: ${file} is unreachable`);
    }
    assert.ok(totalReferenceLines >= expected.referenceLines, `${name}: references are too shallow (${totalReferenceLines})`);
  }
});

test("orchestration references bind receipts, isolation, review, recovery, and cleanup boundaries", () => {
  const requirements = {
    "csw-loop": [/verify --id/i, /artifact --id/i, /cleanup/i, /safe mode/i, /fail-open/i, /blocker/i],
    "csw-plan": [/evidence/i, /non-goal/i, /rollback/i, /manual QA/i, /decision owner/i, /approval/i],
    "csw-review": [/malicious same-user/i, /stale/i, /scope/i, /security/i, /REJECTION/i, /cleanup/i],
    "csw-work": [/checkpoint/i, /resume/i, /rollback/i, /timeout/i, /cleanup/i, /blocked/i],
    swarm: [/\/fleet/i, /\/tasks/i, /host policy/i, /worktree/i, /conflict/i, /cancel/i],
  };
  for (const [name, patterns] of Object.entries(requirements)) {
    const refsDir = join(repoRoot, "skills", name, "references");
    const combined = referenceFiles(refsDir).map((file) => readFileSync(join(refsDir, file), "utf8")).join("\n");
    for (const pattern of patterns) assert.match(combined, pattern, `${name}: missing ${pattern}`);
  }
});
