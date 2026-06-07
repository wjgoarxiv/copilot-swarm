import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import {
  buildArgs,
  runOne,
  runDispatch,
  toDispatchInput,
  TOOLS,
  DISTRUST_GUIDANCE,
} from "../mcp/dispatch/dispatch-core.mjs";

// --- fake spawn ---
function fakeSpawn({ stdout = "", stderr = "", code = 0, emitError = null, delay = 0 } = {}, calls) {
  return (cmd, args, opts) => {
    if (calls) calls.push({ cmd, args, opts });
    const child = new EventEmitter();
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.kill = () => { child._killed = true; };
    const emit = () => {
      if (emitError) { child.emit("error", new Error(emitError)); return; }
      if (stdout) child.stdout.emit("data", Buffer.from(stdout));
      if (stderr) child.stderr.emit("data", Buffer.from(stderr));
      child.emit("close", code);
    };
    if (delay > 0) setTimeout(emit, delay);
    else setImmediate(emit);
    return child;
  };
}

// --- buildArgs ---
test("buildArgs: default mode", () => {
  assert.deepEqual(buildArgs({ prompt: "do x" }), ["-p", "do x", "--allow-all-tools"]);
});

test("buildArgs: read_only adds preamble and denies write", () => {
  const a = buildArgs({ prompt: "find y", mode: "read_only" });
  assert.equal(a[0], "-p");
  assert.match(a[1], /READ-ONLY TASK/);
  assert.match(a[1], /find y/);
  assert.ok(a.includes("--deny-tool") && a.includes("write"));
});

test("buildArgs: research adds citation preamble and denies write", () => {
  const a = buildArgs({ prompt: "lib z", mode: "research" });
  assert.match(a[1], /pinned commit SHA or permalink/);
  assert.ok(a.includes("--deny-tool"));
});

test("buildArgs: model flag and roster agent auto-namespacing", () => {
  const a = buildArgs({ prompt: "x", model: "gpt-5.5", agent: "explorer" });
  assert.ok(a.includes("--model") && a.includes("gpt-5.5"));
  // bare roster name is namespaced to the plugin agent id
  assert.ok(a.includes("--agent") && a.includes("copilot-swarm:explorer"));
});

test("buildArgs: already-namespaced or non-roster agent passes through unchanged", () => {
  assert.ok(buildArgs({ prompt: "x", agent: "copilot-swarm:verifier" }).includes("copilot-swarm:verifier"));
  const custom = buildArgs({ prompt: "x", agent: "my-own-agent" });
  assert.ok(custom.includes("my-own-agent") && !custom.includes("copilot-swarm:my-own-agent"));
});

test("buildArgs: empty prompt throws", () => {
  assert.throws(() => buildArgs({ prompt: "" }), /non-empty/);
  assert.throws(() => buildArgs({}), /non-empty/);
});

// --- runOne ---
test("runOne: success captures trimmed stdout", async () => {
  const r = await runOne({ id: "t1", prompt: "x" }, { spawnImpl: fakeSpawn({ stdout: "result\n" }) });
  assert.equal(r.ok, true);
  assert.equal(r.exitCode, 0);
  assert.equal(r.output, "result");
  assert.equal(r.id, "t1");
});

test("runOne: non-zero exit reports error", async () => {
  const r = await runOne({ id: "t2", prompt: "x" }, { spawnImpl: fakeSpawn({ stderr: "boom", code: 3 }) });
  assert.equal(r.ok, false);
  assert.equal(r.exitCode, 3);
  assert.match(r.error, /boom/);
});

test("runOne: spawn error is captured", async () => {
  const r = await runOne({ id: "t3", prompt: "x" }, { spawnImpl: fakeSpawn({ emitError: "ENOENT" }) });
  assert.equal(r.ok, false);
  assert.match(r.error, /ENOENT/);
});

test("runOne: timeout kills and reports", async () => {
  // child that never closes
  const neverCloses = () => {
    const c = new EventEmitter();
    c.stdout = new EventEmitter();
    c.stderr = new EventEmitter();
    c.kill = () => { c._killed = true; };
    return c;
  };
  const r = await runOne({ id: "t4", prompt: "x" }, { spawnImpl: neverCloses, timeoutMs: 25 });
  assert.equal(r.ok, false);
  assert.match(r.error, /timeout/);
});

test("runOne: invalid task resolves to error (no throw)", async () => {
  const r = await runOne({ id: "t5", prompt: "" }, { spawnImpl: fakeSpawn({}) });
  assert.equal(r.ok, false);
  assert.match(r.error, /non-empty/);
});

// --- runDispatch ---
test("runDispatch: runs all tasks and summarizes", async () => {
  const out = await runDispatch(
    { tasks: [{ prompt: "a" }, { prompt: "b" }, { prompt: "c" }] },
    { spawnImpl: fakeSpawn({ stdout: "ok" }) },
  );
  assert.equal(out.results.length, 3);
  assert.equal(out.summary.ok, 3);
  assert.equal(out.summary.failed, 0);
  assert.equal(out.guidance, DISTRUST_GUIDANCE);
  assert.deepEqual(out.results.map((r) => r.id), ["task-1", "task-2", "task-3"]);
});

test("runDispatch: respects concurrency cap", async () => {
  let active = 0, maxActive = 0;
  const spawnImpl = (cmd, args) => {
    active++;
    maxActive = Math.max(maxActive, active);
    const child = new EventEmitter();
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.kill = () => {};
    setTimeout(() => { active--; child.emit("close", 0); }, 15);
    return child;
  };
  const tasks = Array.from({ length: 6 }, (_, i) => ({ prompt: `t${i}` }));
  const out = await runDispatch({ tasks, maxConcurrency: 2 }, { spawnImpl });
  assert.equal(out.results.length, 6);
  assert.ok(maxActive <= 2, `maxActive ${maxActive} should be <= 2`);
});

test("runDispatch: empty tasks throws", async () => {
  await assert.rejects(() => runDispatch({ tasks: [] }), /non-empty/);
});

test("runDispatch: refuses to dispatch past the depth limit (recursion guard)", async () => {
  const saved = process.env.CSW_DISPATCH_DEPTH;
  process.env.CSW_DISPATCH_DEPTH = "1"; // a worker (depth 1) trying to re-dispatch
  try {
    await assert.rejects(() => runDispatch({ tasks: [{ prompt: "x" }] }, { spawnImpl: fakeSpawn({}) }), /depth limit/);
  } finally {
    if (saved === undefined) delete process.env.CSW_DISPATCH_DEPTH;
    else process.env.CSW_DISPATCH_DEPTH = saved;
  }
});

test("runDispatch: injects incremented CSW_DISPATCH_DEPTH into worker env", async () => {
  const calls = [];
  await runDispatch({ tasks: [{ prompt: "x" }] }, { spawnImpl: fakeSpawn({}, calls) });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].opts.env.CSW_DISPATCH_DEPTH, "1"); // parent depth 0 -> child 1
});

test("runOne: synchronous spawn throw resolves to error (preserves isolation)", async () => {
  const throwingSpawn = () => { throw new Error("sync-spawn-boom"); };
  const r = await runOne({ id: "s", prompt: "x" }, { spawnImpl: throwingSpawn });
  assert.equal(r.ok, false);
  assert.match(r.error, /sync-spawn-boom/);
});

// --- toDispatchInput ---
test("toDispatchInput: dispatch passthrough", () => {
  const i = toDispatchInput("dispatch", { tasks: [{ prompt: "x" }], maxConcurrency: 3 });
  assert.equal(i.tasks.length, 1);
  assert.equal(i.maxConcurrency, 3);
});

test("toDispatchInput: code_search maps queries to read_only tasks", () => {
  const i = toDispatchInput("code_search", { queries: ["where is foo", "where is bar"] });
  assert.equal(i.tasks.length, 2);
  assert.ok(i.tasks.every((t) => t.mode === "read_only"));
});

test("toDispatchInput: research maps to research mode", () => {
  const i = toDispatchInput("research", { queries: ["how does lib x work"] });
  assert.equal(i.tasks[0].mode, "research");
});

test("toDispatchInput: unknown tool throws", () => {
  assert.throws(() => toDispatchInput("nope", {}), /unknown tool/);
});

test("toDispatchInput: missing queries throws", () => {
  assert.throws(() => toDispatchInput("code_search", {}), /non-empty/);
});

// --- TOOLS schema sanity ---
test("TOOLS expose dispatch/code_search/research with input schemas", () => {
  const names = TOOLS.map((t) => t.name);
  assert.deepEqual(names, ["dispatch", "code_search", "research"]);
  for (const t of TOOLS) {
    assert.equal(t.inputSchema.type, "object");
    assert.ok(t.description.length > 0);
  }
});
