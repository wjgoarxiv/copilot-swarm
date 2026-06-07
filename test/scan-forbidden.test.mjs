import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync, rmSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  scanText,
  scanFileList,
  isBinaryBuffer,
  TOKENS,
} from "../scripts/scanner-core.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const dec = (b64) => Buffer.from(b64, "base64").toString("utf8");

// Decoded sample tokens used by tests (kept base64 so this test file is token-clean).
const T_SUBSTR = dec("bGF6eWNvZGV4"); // a distinctive multi-char token
const T_BOUNDARY = dec("Y29kZXg="); // a short boundary-matched token

test("token table is populated with both modes", () => {
  assert.ok(TOKENS.length >= 10);
  assert.ok(TOKENS.some((t) => t.mode === "substr"));
  assert.ok(TOKENS.some((t) => t.mode === "boundary"));
});

test("scanText detects a substring token", () => {
  const hits = scanText(`prefix ${T_SUBSTR} suffix`);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].token, T_SUBSTR);
});

test("scanText detects a boundary token on boundaries", () => {
  assert.equal(scanText(`use ${T_BOUNDARY} here`).length, 1);
  assert.equal(scanText(`path/${T_BOUNDARY}-hook.ts`).length, 1);
  assert.equal(scanText(`.${T_BOUNDARY}_HOME`).length, 1);
});

test("scanText does NOT flag a boundary token inside a larger word", () => {
  // boundary token embedded between identifier chars must not match
  assert.equal(scanText(`xx${T_BOUNDARY}xx`).length, 0);
  assert.equal(scanText(`a${T_BOUNDARY}9`).length, 0);
});

test("scanner source files are self-clean", () => {
  const findings = scanFileList([
    join(repoRoot, "scripts/scanner-core.mjs"),
    join(repoRoot, "scripts/scan-forbidden.mjs"),
    join(repoRoot, "test/scan-forbidden.test.mjs"),
  ]);
  assert.deepEqual(findings, [], `self-scan must be clean:\n${JSON.stringify(findings, null, 2)}`);
});

test("scanFileList flags content in a planted fixture and is clean otherwise", () => {
  const dir = mkdtempSync(join(tmpdir(), "csw-scan-"));
  try {
    const dirty = join(dir, "dirty.txt");
    const clean = join(dir, "clean.txt");
    writeFileSync(dirty, `line1\nthis mentions ${T_SUBSTR} on line 2\n`);
    writeFileSync(clean, "nothing forbidden here\n");
    const findings = scanFileList([dirty, clean]);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].where, "content");
    assert.equal(findings[0].line, 2);
    assert.equal(findings[0].file, dirty);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("scanFileList flags a forbidden token in a file path", () => {
  const dir = mkdtempSync(join(tmpdir(), "csw-scan-"));
  try {
    const f = join(dir, `${T_SUBSTR}-notes.txt`);
    writeFileSync(f, "clean content\n");
    const findings = scanFileList([f]);
    assert.ok(findings.some((x) => x.where === "path"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("binary files are path-only (content not scanned)", () => {
  assert.equal(isBinaryBuffer(Buffer.from([1, 2, 0, 3])), true);
  assert.equal(isBinaryBuffer(Buffer.from("plain text", "utf8")), false);
  const dir = mkdtempSync(join(tmpdir(), "csw-scan-"));
  try {
    const bin = join(dir, "image.bin");
    // token bytes present, but a NUL makes it binary => content must be skipped
    writeFileSync(bin, Buffer.concat([Buffer.from([0]), Buffer.from(T_SUBSTR, "utf8")]));
    const findings = scanFileList([bin]);
    assert.equal(findings.filter((f) => f.where === "content").length, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- Surface integration via the CLI (exit-code contract) ---

const CLI = join(repoRoot, "scripts/scan-forbidden.mjs");

function runCli(args) {
  try {
    const stdout = execFileSync(process.execPath, [CLI, ...args], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    return { code: 0, stdout };
  } catch (err) {
    return { code: err.status ?? 1, stdout: err.stdout?.toString() ?? "", stderr: err.stderr?.toString() ?? "" };
  }
}

test("CLI: tracked surface is clean (exit 0)", () => {
  assert.equal(runCli(["--surface", "tracked"]).code, 0);
});

test("CLI: packable surface is clean (exit 0)", () => {
  assert.equal(runCli(["--surface", "packable"]).code, 0);
});

test("CLI: tarball surface is clean (exit 0)", () => {
  assert.equal(runCli(["--surface", "tarball"]).code, 0);
});

test("CLI: direct-run guard fires when the path contains a space", () => {
  // Regression: a naive `file://${argv[1]}` guard mismatches percent-encoded
  // URLs, leaving the CLI inert (silent false-all-clear). Copy the scanner into
  // a directory whose name contains a space and confirm it actually runs.
  const dir = mkdtempSync(join(tmpdir(), "csw space-"));
  try {
    copyFileSync(join(repoRoot, "scripts/scanner-core.mjs"), join(dir, "scanner-core.mjs"));
    copyFileSync(join(repoRoot, "scripts/scan-forbidden.mjs"), join(dir, "scan-forbidden.mjs"));
    const planted = join(dir, "planted.txt");
    writeFileSync(planted, `has ${T_BOUNDARY} token\n`);
    const res = (() => {
      try {
        const stdout = execFileSync(process.execPath, [join(dir, "scan-forbidden.mjs"), "--paths", planted], { encoding: "utf8" });
        return { code: 0, stdout };
      } catch (err) {
        return { code: err.status ?? 1, stdout: err.stdout?.toString() ?? "" };
      }
    })();
    // If the guard were broken, run() would never fire => exit 0 with no detection.
    assert.equal(res.code, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI: planted token via --paths exits non-zero", () => {
  const dir = mkdtempSync(join(tmpdir(), "csw-scan-"));
  try {
    const f = join(dir, "planted.txt");
    writeFileSync(f, `contains ${T_BOUNDARY} token\n`);
    assert.equal(runCli(["--paths", f]).code, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
