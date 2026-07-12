import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync, writeFileSync, mkdirSync, utimesSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

import * as rt from "../runtime/src/runtime.mjs";
import { transactState } from "../runtime/src/store.mjs";

const runtimeUrl = new URL("../runtime/src/runtime.mjs", import.meta.url).href;
const cliPath = new URL("../bin/csw-runtime.mjs", import.meta.url).pathname;
const cwdForTest = () => mkdtempSync(join(tmpdir(), "csw-concurrency-"));

function writer(cwd, id) {
  const code = `import * as rt from ${JSON.stringify(runtimeUrl)}; rt.addBlocker({id:${JSON.stringify(id)}, reason:"parallel"}, ${JSON.stringify(cwd)});`;
  return runModule(cwd, code);
}

function runModule(cwd, code) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--input-type=module", "-e", code], { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (status) => status === 0 ? resolve() : reject(new Error(`child exited ${status}: ${stderr}`)));
  });
}

async function waitFor(path, timeoutMs = 2_000) {
  const deadline = Date.now() + timeoutMs;
  while (!existsSync(path)) {
    if (Date.now() >= deadline) throw new Error(`timed out waiting for ${path}`);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

test("24 independent processes update state without lost writes or malformed JSON", async () => {
  const cwd = cwdForTest();
  try {
    rt.initGoal({ objective: "concurrency", criteriaText: "C001 | channel: cli | test: t | scenario: s" }, cwd);
    await Promise.all(Array.from({ length: 24 }, (_, i) => writer(cwd, `b${String(i).padStart(2, "0")}`)));
    const state = rt.getState(cwd);
    assert.equal(state.reviewBlockers.length, 24);
    assert.deepEqual(state.reviewBlockers.map((b) => b.id).sort(), Array.from({ length: 24 }, (_, i) => `b${String(i).padStart(2, "0")}`));
    assert.doesNotThrow(() => JSON.parse(readFileSync(join(cwd, ".csw/state.json"), "utf8")));
    const ledger = readFileSync(join(cwd, ".csw/ledger.jsonl"), "utf8").trim().split("\n").map(JSON.parse);
    assert.equal(ledger.filter((e) => e.kind === "blocker_added").length, 24);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("state lock retry is bounded and stale locks are recovered", () => {
  const cwd = cwdForTest();
  try {
    rt.initGoal({ objective: "locking", criteriaText: "C001 | channel: cli | test: t | scenario: s" }, cwd);
    const lock = join(cwd, ".csw", "state.lock");
    mkdirSync(lock);
    assert.throws(
      () => transactState(cwd, () => ({}), { waitMs: 20, staleMs: 10_000 }),
      /timed out waiting for state lock/,
    );
    const old = new Date(Date.now() - 20_000);
    utimesSync(lock, old, old);
    assert.doesNotThrow(() => rt.addBlocker({ id: "recovered", reason: "stale lock" }, cwd));
    assert.equal(rt.getState(cwd).reviewBlockers[0].id, "recovered");
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("a stale-aged lock owned by a live process is never stolen", async () => {
  const cwd = cwdForTest();
  try {
    rt.initGoal({ objective: "live lock", criteriaText: "C001 | channel: cli | test: t | scenario: s" }, cwd);
    const marker = join(cwd, "lock-held");
    const storeUrl = new URL("../runtime/src/store.mjs", import.meta.url).href;
    const code = `import { writeFileSync } from "node:fs"; import { transactState } from ${JSON.stringify(storeUrl)}; transactState(${JSON.stringify(cwd)}, state => { writeFileSync(${JSON.stringify(marker)}, "held"); Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,250); state.reviewBlockers.push({id:"holder",reason:"live",resolved:false}); return {nextState:state,write:true}; });`;
    const holder = runModule(cwd, code);
    await waitFor(marker);
    assert.throws(
      () => transactState(cwd, () => ({ write: false }), { waitMs: 80, staleMs: 20 }),
      /timed out waiting for state lock/,
    );
    await holder;
    assert.equal(rt.getState(cwd).reviewBlockers[0].id, "holder");
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("a stale lock owned by a demonstrably dead process is recovered", async () => {
  const cwd = cwdForTest();
  try {
    rt.initGoal({ objective: "dead lock", criteriaText: "C001 | channel: cli | test: t | scenario: s" }, cwd);
    const dead = spawn(process.execPath, ["-e", "process.exit(0)"], { stdio: "ignore" });
    const deadPid = dead.pid;
    await new Promise((resolve, reject) => {
      dead.on("error", reject);
      dead.on("close", resolve);
    });
    const lock = join(cwd, ".csw", "state.lock");
    mkdirSync(lock);
    writeFileSync(join(lock, "owner"), JSON.stringify({ pid: deadPid, token: "dead" }));
    const old = new Date(Date.now() - 1_000);
    utimesSync(lock, old, old);
    assert.doesNotThrow(() => transactState(cwd, () => ({ write: false }), { waitMs: 100, staleMs: 20 }));
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("competing stale-lock recoverers cannot remove a newly acquired lock", async () => {
  const cwd = cwdForTest();
  try {
    rt.initGoal({ objective: "recoverers", criteriaText: "C001 | channel: cli | test: t | scenario: s" }, cwd);
    const lock = join(cwd, ".csw", "state.lock");
    mkdirSync(lock);
    const old = new Date(Date.now() - 20_000);
    utimesSync(lock, old, old);
    await Promise.all(Array.from({ length: 12 }, (_, i) => writer(cwd, `r${i}`)));
    assert.equal(rt.getState(cwd).reviewBlockers.length, 12);
    assert.equal(readdirSync(join(cwd, ".csw")).some((name) => name.includes("quarantine")), false);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("verification executes outside the state lock and commits without losing concurrent updates", async () => {
  const cwd = cwdForTest();
  try {
    rt.initGoal({ objective: "outside lock", criteriaText: "C001 | channel: cli | test: t | scenario: s" }, cwd);
    const marker = join(cwd, "command-started");
    const command = `require("fs").writeFileSync(${JSON.stringify(marker)}, "yes"); setTimeout(() => {}, 400)`;
    const code = `import * as rt from ${JSON.stringify(runtimeUrl)}; rt.verifyCriterion({id:"C001", argv:[process.execPath,"-e",${JSON.stringify(command)}]}, ${JSON.stringify(cwd)});`;
    const verification = runModule(cwd, code);
    await waitFor(marker);
    const started = Date.now();
    rt.addBlocker({ id: "during-command", reason: "must not wait for command" }, cwd);
    assert.ok(Date.now() - started < 250, "state update waited for verification command");
    await verification;
    const state = rt.getState(cwd);
    assert.equal(state.criteria[0].status, "pass");
    assert.equal(state.reviewBlockers[0].id, "during-command");
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("slow verification cannot overwrite a newer blocked criterion revision", async () => {
  const cwd = cwdForTest();
  try {
    rt.initGoal({ objective: "revision", criteriaText: "C001 | channel: cli | test: t | scenario: s" }, cwd);
    const marker = join(cwd, "slow-started");
    const command = `require("fs").writeFileSync(${JSON.stringify(marker)},"yes"); setTimeout(() => {}, 300)`;
    const code = `import * as rt from ${JSON.stringify(runtimeUrl)}; rt.verifyCriterion({id:"C001",argv:[process.execPath,"-e",${JSON.stringify(command)}]},${JSON.stringify(cwd)});`;
    const slow = runModule(cwd, code).then(() => null, (error) => error);
    await waitFor(marker);
    rt.captureEvidence({ id: "C001", evidence: "new blocker", status: "blocked" }, cwd);
    const error = await slow;
    assert.match(error.message, /criterion changed while verification was running/);
    const criterion = rt.getState(cwd).criteria[0];
    assert.equal(criterion.status, "blocked");
    assert.equal(criterion.revision, 1);
    assert.equal(criterion.receipt, null);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("best-effort outer cancellation cleans an observed daemon after its detached helper exits", async () => {
  const cwd = cwdForTest();
  try {
    rt.initGoal({ objective: "cancel", criteriaText: "C001 | channel: cli | test: t | scenario: s" }, cwd);
    const started = join(cwd, "cancel-descendant-started");
    const survived = join(cwd, "cancel-descendant-survived");
    const helperExited = join(cwd, "cancel-helper-exited");
    const daemon = `require("fs").writeFileSync(${JSON.stringify(started)},"yes"); setTimeout(() => require("fs").writeFileSync(${JSON.stringify(survived)},"bad"),900)`;
    const helper = `const d=require("child_process").spawn(process.execPath,["-e",${JSON.stringify(daemon)}],{stdio:"ignore",detached:true}); d.unref(); setTimeout(() => require("fs").writeFileSync(${JSON.stringify(helperExited)},"yes"),150)`;
    const parent = `const h=require("child_process").spawn(process.execPath,["-e",${JSON.stringify(helper)}],{stdio:"ignore",detached:true}); h.unref(); setTimeout(() => {},5000)`;
    const cli = spawn(process.execPath, [cliPath, "verify", "--id", "C001", "--timeout-ms", "4000", "--", process.execPath, "-e", parent], { cwd, stdio: "ignore" });
    await waitFor(started);
    await waitFor(helperExited);
    cli.kill("SIGTERM");
    await new Promise((resolve) => cli.on("close", resolve));
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    assert.equal(existsSync(survived), false);
    const criterion = rt.getState(cwd).criteria[0];
    assert.equal(criterion.status, "pending");
    assert.equal(criterion.receipt, null);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
