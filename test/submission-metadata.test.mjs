import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(repoRoot, p), "utf8");

test("published version has a dated changelog entry", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.version, "0.1.2");
  const changelog = read("CHANGELOG.md");
  assert.match(changelog, new RegExp(`^## \\[${pkg.version.replaceAll(".", "\\.")}\\] - \\d{4}-\\d{2}-\\d{2}$`, "m"));
  assert.doesNotMatch(changelog, new RegExp(`^## \\[${pkg.version.replaceAll(".", "\\.")}\\] - unreleased$`, "m"));
});

test("package allowlist includes the awesome-copilot manifest", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.ok(pkg.files.includes(".github/plugin"));
});

test("changelog releases the native-first migration as 0.1.2 without rewriting 0.1.1 history", () => {
  const changelog = read("CHANGELOG.md");
  assert.match(changelog, /^## \[Unreleased\]$/m);
  assert.ok(changelog.indexOf("## [Unreleased]") < changelog.indexOf("## [0.1.2] - 2026-07-12"));
  assert.ok(changelog.indexOf("## [0.1.2] - 2026-07-12") < changelog.indexOf("## [0.1.1] - 2026-06-19"));
  assert.match(changelog, /native `task` subagents/);
  assert.match(changelog, /`verify` and `artifact`/);
  assert.match(changelog, /process-tree\s+cleanup is best-effort/i);
  assert.match(changelog, /approved and non-daemonizing/i);
  assert.match(changelog, /^## \[0\.1\.1\] - 2026-06-19$/m);
  assert.match(changelog, /Install-time permission profiles \(`safe`, `balanced`, `full`, `none`\)/);
});

test("English and Korean public docs disclose receipt and command-runner trust boundaries", () => {
  const en = read("README.md");
  const ko = read("README-Ko-KR.md");
  for (const text of [en, ko]) {
    assert.match(text, /malicious same-user editor|같은 사용자 권한의 악의적[\s\S]*편집자/i);
    assert.match(text, /non-git[\s\S]*no workspace-freshness guarantee|non-git 검증에는 workspace 최신성 보장이 없습니다/i);
    assert.match(text, /trusted-command runner|신뢰된 명령\s*실행기/i);
    assert.match(text, /not a sandbox|sandbox가 아닌/i);
    assert.match(text, /worker output|워커 출력/i);
    assert.match(text, /isolated[\s\S]*worktrees?|격리된 worktree/i);
    assert.match(text, /tracked and non-ignored untracked|tracked 파일과 ignore되지 않은[\s\S]*untracked 파일/i);
    assert.match(text, /Ignored[\s\S]*`artifact` receipts|ignored 입력[\s\S]*`artifact` receipt/i);
    assert.match(text, /non-daemonizing|비데몬/i);
    assert.match(text, /best-effort/i);
    assert.match(text, /daemonized commands may[\s\S]*outlive|daemonized 명령은 살아남을 수/i);
    assert.match(text, /cleanup receipt/i);
  }
});

test("public landing surfaces lead with evidence governance, not scheduler replacement", () => {
  for (const file of ["README.md", "README-Ko-KR.md", "generate_cover.py"]) {
    const text = read(file);
    assert.doesNotMatch(text, /parallel task delegation|parallel delegation|병렬 작업 위임/i);
    assert.match(text, /evidence-gated|증거 기반/i);
  }
});
