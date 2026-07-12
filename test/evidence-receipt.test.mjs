import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, mkdirSync, symlinkSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import * as rt from "../runtime/src/runtime.mjs";
import { main } from "../bin/csw-runtime.mjs";
import { loadState } from "../runtime/src/store.mjs";
import { RECEIPT_TRUST_BOUNDARY, validateReceipt } from "../runtime/src/receipts.mjs";

const tmp = () => mkdtempSync(join(tmpdir(), "csw-receipt-"));
const CRITERION = "C001 | channel: cli | test: node | scenario: exits zero";
const CLI = fileURLToPath(new URL("../bin/csw-runtime.mjs", import.meta.url));

function init(cwd) {
  rt.initGoal({ objective: "receipt test", criteriaText: CRITERION }, cwd);
}

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

test("verify preserves argv without shell interpretation but records hashes, never raw arguments or output", () => {
  const cwd = tmp();
  try {
    init(cwd);
    const secret = `arbitrary-secret-${Date.now()}`;
    const injected = `${secret}; touch ${join(cwd, "INJECTED")}`;
    const argv = [process.execPath, "-e", "console.log(process.argv[1])", injected];
    const cli = spawnSync(process.execPath, [CLI, "verify", "--id", "C001", "--", ...argv], {
      cwd,
      env: { ...process.env, CSW_HOME: join(cwd, ".csw") },
      encoding: "utf8",
    });
    assert.equal(cli.status, 0, cli.stderr);
    assert.doesNotMatch(cli.stdout, new RegExp(secret));
    assert.doesNotMatch(cli.stderr, new RegExp(secret));
    const criterion = rt.getState(cwd).criteria[0];
    assert.equal(criterion.status, "pass");
    assert.equal(criterion.receipt.type, "verify");
    assert.equal(criterion.receipt.exitCode, 0);
    assert.equal(criterion.receipt.receiptVersion, 1);
    assert.equal(criterion.receipt.argv0Sha256, sha256(process.execPath));
    assert.equal(criterion.receipt.argumentCount, 3);
    assert.equal(criterion.receipt.argvSha256, sha256(JSON.stringify(argv)));
    assert.equal(criterion.receipt.output.stdout.bytes, Buffer.byteLength(`${injected}\n`));
    assert.equal(criterion.receipt.output.stdout.sha256, sha256(`${injected}\n`));
    assert.equal(criterion.receipt.output.stderr.bytes, 0);
    assert.equal("argv" in criterion.receipt, false);
    assert.equal("executable" in criterion.receipt, false);
    assert.equal("stdout" in criterion.receipt, false);
    assert.equal("stderr" in criterion.receipt, false);
    assert.doesNotMatch(JSON.stringify(criterion.receipt), new RegExp(secret));
    assert.doesNotMatch(readFileSync(join(cwd, ".csw/state.json"), "utf8"), new RegExp(secret));
    assert.doesNotMatch(readFileSync(join(cwd, ".csw/ledger.jsonl"), "utf8"), new RegExp(secret));
    assert.equal(existsSync(join(cwd, "INJECTED")), false);
    assert.equal(main(["verify", "--id", "C001", "--", process.execPath, "-e", "process.exit(process.argv[1] === '--id' ? 0 : 9)", "--", "--id", "C999"], cwd), 0);
    assert.equal(rt.getState(cwd).criteria[0].status, "pass");
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("verify uses a sanitized environment and never persists output content", () => {
  const cwd = tmp();
  const secret = "ghp_" + "S".repeat(36);
  const old = process.env.CSW_TEST_SECRET_TOKEN;
  process.env.CSW_TEST_SECRET_TOKEN = secret;
  try {
    init(cwd);
    const script = `console.log(process.env.CSW_TEST_SECRET_TOKEN || "missing"); console.error(${JSON.stringify(secret)})`;
    rt.verifyCriterion({ id: "C001", argv: [process.execPath, "-e", script] }, cwd);
    const raw = readFileSync(join(cwd, ".csw/state.json"), "utf8");
    assert.doesNotMatch(raw, new RegExp(secret));
    assert.doesNotMatch(raw, /missing/);
    const receipt = rt.getState(cwd).criteria[0].receipt;
    assert.equal(receipt.output.stdout.bytes, Buffer.byteLength("missing\n"));
    assert.equal(receipt.output.stderr.bytes, Buffer.byteLength(`${secret}\n`));
  } finally {
    if (old === undefined) delete process.env.CSW_TEST_SECRET_TOKEN;
    else process.env.CSW_TEST_SECRET_TOKEN = old;
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("verify stores only bounded-output metadata", () => {
  const cwd = tmp();
  try {
    init(cwd);
    const c = rt.verifyCriterion({ id: "C001", argv: [process.execPath, "-e", "process.stdout.write('x'.repeat(20000))"] }, cwd);
    assert.equal(c.status, "pass");
    assert.equal(c.receipt.output.stdout.bytes, 20000);
    assert.equal(c.receipt.output.stdout.sha256, sha256("x".repeat(20000)));
    assert.equal(c.receipt.output.limitExceeded, false);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("verify treats output-limit ENOBUFS as an explicit failure", () => {
  const cwd = tmp();
  try {
    init(cwd);
    const c = rt.verifyCriterion({ id: "C001", argv: [process.execPath, "-e", "process.stdout.write('x'.repeat(2 * 1024 * 1024))"] }, cwd);
    assert.equal(c.status, "fail");
    assert.equal(c.receipt.errorCode, "ENOBUFS");
    assert.equal(c.receipt.output.limitExceeded, true);
    assert.equal(c.receipt.output.truncated, true);
    assert.ok(c.receipt.output.stdout.bytes > c.receipt.output.limitBytes);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("best-effort timeout cleanup removes an observed detached daemon before its marker", async () => {
  const cwd = tmp();
  try {
    init(cwd);
    const marker = join(cwd, "descendant-survived");
    const started = join(cwd, "descendant-started");
    const helperExited = join(cwd, "intermediate-helper-exited");
    const daemon = `require("fs").writeFileSync(${JSON.stringify(started)},"yes"); setTimeout(() => require("fs").writeFileSync(${JSON.stringify(marker)},"bad"),900)`;
    const helper = `const d=require("child_process").spawn(process.execPath,["-e",${JSON.stringify(daemon)}],{stdio:"ignore",detached:true}); d.unref(); setTimeout(() => require("fs").writeFileSync(${JSON.stringify(helperExited)},"yes"),150)`;
    const parent = `const h=require("child_process").spawn(process.execPath,["-e",${JSON.stringify(helper)}],{stdio:"ignore",detached:true}); h.unref(); setTimeout(() => {},2000)`;
    const c = rt.verifyCriterion({ id: "C001", argv: [process.execPath, "-e", parent], timeoutMs: 500 }, cwd);
    assert.equal(c.status, "fail");
    assert.equal(c.receipt.timedOut, true);
    assert.equal(existsSync(started), true, "descendant did not start before timeout");
    assert.equal(existsSync(helperExited), true, "intermediate helper did not exit before timeout");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    assert.equal(existsSync(marker), false);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("verify records nonzero and timeout as failure and rejects malformed argv", () => {
  const cwd = tmp();
  try {
    init(cwd);
    let c = rt.verifyCriterion({ id: "C001", argv: [process.execPath, "-e", "process.exit(7)"] }, cwd);
    assert.equal(c.status, "fail");
    assert.equal(c.receipt.exitCode, 7);
    c = rt.verifyCriterion({ id: "C001", argv: [process.execPath, "-e", "setTimeout(() => {}, 1000)"], timeoutMs: 25 }, cwd);
    assert.equal(c.status, "fail");
    assert.equal(c.receipt.timedOut, true);
    assert.throws(() => rt.verifyCriterion({ id: "C001", argv: [] }, cwd), /nonempty argv/);
    assert.equal(main(["verify", "--id", "C001", process.execPath], cwd), 2);
    assert.equal(main(["verify", "--id", "C001", "--timeout-ms", "invalid", "--", process.execPath], cwd), 2);
    assert.equal(rt.status(cwd).done, false);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("artifact receipt stores relative path, size, hash and permits completion", () => {
  const cwd = tmp();
  try {
    init(cwd);
    mkdirSync(join(cwd, "out"));
    writeFileSync(join(cwd, "out", "proof.txt"), "proof\n");
    const c = rt.captureArtifact({ id: "C001", path: "out/proof.txt", summary: "generated proof" }, cwd);
    assert.equal(c.status, "pass");
    assert.equal(c.receipt.type, "artifact");
    assert.equal(c.receipt.receiptVersion, 1);
    assert.equal(c.receipt.criterionRevision, 0);
    assert.equal(c.revision, 1);
    assert.equal(c.receipt.path, "out/proof.txt");
    assert.equal(c.receipt.size, 6);
    assert.match(c.receipt.sha256, /^[a-f0-9]{64}$/);
    assert.equal(validateReceipt(c.receipt).valid, true);
    assert.equal(validateReceipt({ ...c.receipt, unknown: true }).valid, false);
    assert.equal(rt.complete(cwd).completed, true);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("artifact rejects empty files and lexical or symlink escapes", () => {
  const cwd = tmp();
  const outside = tmp();
  try {
    init(cwd);
    writeFileSync(join(cwd, "empty"), "");
    writeFileSync(join(outside, "proof"), "outside");
    symlinkSync(join(outside, "proof"), join(cwd, "link"));
    assert.throws(() => rt.captureArtifact({ id: "C001", path: "empty", summary: "x" }, cwd), /nonempty regular file/);
    assert.throws(() => rt.captureArtifact({ id: "C001", path: join(outside, "proof"), summary: "x" }, cwd), /within cwd/);
    assert.throws(() => rt.captureArtifact({ id: "C001", path: "link", summary: "x" }, cwd), /within cwd/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

test("artifact mutation is detected by status and completion", () => {
  const cwd = tmp();
  try {
    init(cwd);
    writeFileSync(join(cwd, "proof"), "before");
    rt.captureArtifact({ id: "C001", path: "proof", summary: "proof" }, cwd);
    writeFileSync(join(cwd, "proof"), "after");
    const verdict = rt.status(cwd);
    assert.equal(verdict.done, false);
    assert.match(verdict.reasons.join("\n"), /artifact.*(size|SHA-256|changed)/i);
    assert.throws(() => rt.complete(cwd), /cannot complete/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("artifact receipt binds the opened canonical target identity across symlink retargeting", () => {
  const cwd = tmp();
  try {
    init(cwd);
    writeFileSync(join(cwd, "first"), "same");
    writeFileSync(join(cwd, "second"), "same");
    symlinkSync(join(cwd, "first"), join(cwd, "proof-link"));
    const c = rt.captureArtifact({ id: "C001", path: "proof-link", summary: "bound target" }, cwd);
    assert.equal(typeof c.receipt.device, "number");
    assert.equal(typeof c.receipt.inode, "number");
    unlinkSync(join(cwd, "proof-link"));
    symlinkSync(join(cwd, "second"), join(cwd, "proof-link"));
    const verdict = rt.status(cwd);
    assert.equal(verdict.done, false);
    assert.match(verdict.reasons.join("\n"), /identity changed/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("artifact CLI validates required values and malformed state is not overwritten", () => {
  const cwd = tmp();
  try {
    init(cwd);
    assert.equal(main(["artifact", "--id", "C001", "--path", "x"], cwd), 2);
    writeFileSync(join(cwd, ".csw/state.json"), "{broken");
    assert.throws(() => rt.getState(cwd), /malformed state/);
    assert.equal(readFileSync(join(cwd, ".csw/state.json"), "utf8"), "{broken");
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("reading an early v2 receipt removes raw argv and output before returning or persisting state", () => {
  const cwd = tmp();
  const secret = `unclassified-secret-${Date.now()}`;
  try {
    init(cwd);
    const path = join(cwd, ".csw/state.json");
    const state = JSON.parse(readFileSync(path, "utf8"));
    state.completed = true;
    state.completedAt = new Date().toISOString();
    state.criteria[0].status = "pass";
    state.criteria[0].receipt = {
      type: "verify",
      argv: [process.execPath, secret],
      exitCode: 0,
      stdout: secret,
      stderr: "",
      error: secret,
    };
    writeFileSync(path, JSON.stringify(state));
    const loaded = rt.getState(cwd);
    assert.equal(loaded.completed, false);
    assert.equal(loaded.criteria[0].status, "pending");
    assert.equal(loaded.criteria[0].receipt, null);
    assert.doesNotMatch(JSON.stringify(loaded), new RegExp(secret));
    assert.doesNotMatch(readFileSync(path, "utf8"), new RegExp(secret));
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("receipt schema is exact and structural, not authentication against a same-user editor", () => {
  const cwd = tmp();
  try {
    init(cwd);
    const receipt = rt.verifyCriterion({ id: "C001", argv: [process.execPath, "-e", "process.exit(0)"] }, cwd).receipt;
    assert.equal(validateReceipt(receipt).valid, true);
    for (const mutate of [
      (copy) => { delete copy.receiptVersion; },
      (copy) => { copy.argv0Sha256 = "short"; },
      (copy) => { copy.unknown = true; },
      (copy) => { copy.output.stdout.raw = "forbidden"; },
      (copy) => { copy.workspace.reason = "unknown"; },
    ]) {
      const copy = structuredClone(receipt);
      mutate(copy);
      assert.equal(validateReceipt(copy).valid, false);
    }
    assert.match(RECEIPT_TRUST_BOUNDARY, /does not authenticate.*same-user/i);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("loadState durably resets malformed v2 receipts and completion", () => {
  const cwd = tmp();
  try {
    init(cwd);
    const path = join(cwd, ".csw/state.json");
    const state = JSON.parse(readFileSync(path, "utf8"));
    state.completed = true;
    state.completedAt = new Date().toISOString();
    state.criteria[0].status = "pass";
    state.criteria[0].receipt = { type: "verify", receiptVersion: 1, unknown: "unsafe" };
    writeFileSync(path, JSON.stringify(state));
    const loaded = loadState(cwd);
    assert.equal(loaded.completed, false);
    assert.equal(loaded.criteria[0].status, "pending");
    assert.equal(loaded.criteria[0].receipt, null);
    assert.equal(loaded.criteria[0].notes.at(-1).verified, false);
    const persisted = JSON.parse(readFileSync(path, "utf8"));
    assert.equal(persisted.completed, false);
    assert.equal(persisted.criteria[0].receipt, null);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("steer persists migrated receipt cleanup despite a read-only callback", () => {
  const cwd = tmp();
  const secret = `unsafe-steer-secret-${Date.now()}`;
  try {
    init(cwd);
    const path = join(cwd, ".csw/state.json");
    const state = JSON.parse(readFileSync(path, "utf8"));
    state.criteria[0].status = "pass";
    state.criteria[0].revision = 1;
    state.criteria[0].receipt = { type: "verify", receiptVersion: 1, argv: [secret], stdout: secret };
    writeFileSync(path, JSON.stringify(state));
    assert.equal(rt.steer({ text: "add a stronger test" }, cwd).accepted, true);
    const persisted = readFileSync(path, "utf8");
    assert.doesNotMatch(persisted, new RegExp(secret));
    const cleaned = JSON.parse(persisted);
    assert.equal(cleaned.criteria[0].status, "pending");
    assert.equal(cleaned.criteria[0].receipt, null);
    assert.equal(cleaned.criteria[0].notes.at(-1).verified, false);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("verify receipt becomes stale when tracked workspace content changes", () => {
  const cwd = tmp();
  try {
    const git = (args, env = process.env) => spawnSync("git", args, { cwd, env, encoding: "utf8" });
    assert.equal(git(["init", "-q"]).status, 0);
    writeFileSync(join(cwd, "tracked.txt"), "before\n");
    assert.equal(git(["add", "tracked.txt"]).status, 0);
    const env = { ...process.env, GIT_AUTHOR_NAME: "Test", GIT_AUTHOR_EMAIL: "test@example.invalid", GIT_COMMITTER_NAME: "Test", GIT_COMMITTER_EMAIL: "test@example.invalid" };
    assert.equal(git(["commit", "-q", "-m", "fixture"], env).status, 0);
    init(cwd);
    rt.verifyCriterion({ id: "C001", argv: [process.execPath, "-e", "process.exit(0)"] }, cwd);
    assert.equal(rt.getState(cwd).criteria[0].receipt.workspace.scope, "git-visible");
    assert.equal(rt.status(cwd).done, true);
    writeFileSync(join(cwd, "tracked.txt"), "after\n");
    const verdict = rt.status(cwd);
    assert.equal(verdict.done, false);
    assert.match(verdict.reasons.join("\n"), /workspace.*changed/i);
    writeFileSync(join(cwd, "tracked.txt"), "before\n");
    writeFileSync(join(cwd, "untracked.txt"), "first\n");
    rt.verifyCriterion({ id: "C001", argv: [process.execPath, "-e", "process.exit(0)"] }, cwd);
    assert.equal(rt.status(cwd).done, true);
    writeFileSync(join(cwd, "untracked.txt"), "second\n");
    assert.match(rt.status(cwd).reasons.join("\n"), /workspace.*changed/i);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("ancestor CSW_HOME never excludes the repository from untracked freshness", () => {
  const outer = tmp();
  const cwd = join(outer, "repo");
  const previous = process.env.CSW_HOME;
  try {
    mkdirSync(cwd);
    process.env.CSW_HOME = outer;
    const git = (args, env = process.env) => spawnSync("git", args, { cwd, env, encoding: "utf8" });
    assert.equal(git(["init", "-q"]).status, 0);
    writeFileSync(join(cwd, "tracked.txt"), "tracked\n");
    assert.equal(git(["add", "tracked.txt"]).status, 0);
    const env = { ...process.env, GIT_AUTHOR_NAME: "Test", GIT_AUTHOR_EMAIL: "test@example.invalid", GIT_COMMITTER_NAME: "Test", GIT_COMMITTER_EMAIL: "test@example.invalid" };
    assert.equal(git(["commit", "-q", "-m", "fixture"], env).status, 0);
    writeFileSync(join(cwd, "visible.txt"), "before\n");
    init(cwd);
    rt.verifyCriterion({ id: "C001", argv: [process.execPath, "-e", "process.exit(0)"] }, cwd);
    writeFileSync(join(cwd, "visible.txt"), "after\n");
    assert.throws(() => rt.complete(cwd), /workspace changed after verification/);
  } finally {
    if (previous === undefined) delete process.env.CSW_HOME;
    else process.env.CSW_HOME = previous;
    rmSync(outer, { recursive: true, force: true });
  }
});

test("git-visible scope excludes ignored files and artifact receipts cover them explicitly", () => {
  const cwd = tmp();
  try {
    const git = (args, env = process.env) => spawnSync("git", args, { cwd, env, encoding: "utf8" });
    assert.equal(git(["init", "-q"]).status, 0);
    writeFileSync(join(cwd, ".gitignore"), "ignored.txt\n.csw/\n");
    writeFileSync(join(cwd, "tracked.txt"), "tracked\n");
    assert.equal(git(["add", ".gitignore", "tracked.txt"]).status, 0);
    const env = { ...process.env, GIT_AUTHOR_NAME: "Test", GIT_AUTHOR_EMAIL: "test@example.invalid", GIT_COMMITTER_NAME: "Test", GIT_COMMITTER_EMAIL: "test@example.invalid" };
    assert.equal(git(["commit", "-q", "-m", "fixture"], env).status, 0);
    writeFileSync(join(cwd, "ignored.txt"), "before\n");
    init(cwd);
    const verified = rt.verifyCriterion({ id: "C001", argv: [process.execPath, "-e", "process.exit(0)"] }, cwd);
    assert.equal(verified.receipt.workspace.scope, "git-visible");
    writeFileSync(join(cwd, "ignored.txt"), "after\n");
    assert.equal(rt.status(cwd).done, true, "ignored files are outside git-visible scope");

    rt.initGoal({ objective: "ignored artifact", criteriaText: CRITERION }, cwd);
    rt.captureArtifact({ id: "C001", path: "ignored.txt", summary: "ignored output" }, cwd);
    writeFileSync(join(cwd, "ignored.txt"), "changed again\n");
    assert.match(rt.status(cwd).reasons.join("\n"), /artifact.*changed/i);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
