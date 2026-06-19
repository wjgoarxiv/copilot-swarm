import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { spawn } from "node:child_process";
import { writeFileSync, mkdtempSync, rmSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { handleMessage } from "../mcp/dispatch/server.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function fakeSpawn({ stdout = "ok", code = 0 } = {}) {
  return () => {
    const child = new EventEmitter();
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.kill = () => {};
    setImmediate(() => {
      child.stdout.emit("data", Buffer.from(stdout));
      child.emit("close", code);
    });
    return child;
  };
}

test("initialize echoes protocol version and reports serverInfo", async () => {
  const res = await handleMessage({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } });
  assert.equal(res.id, 1);
  assert.equal(res.result.protocolVersion, "2025-06-18");
  assert.equal(res.result.serverInfo.name, "csw-dispatch");
  assert.deepEqual(res.result.capabilities, { tools: {} });
});

test("tools/list returns the three swarm tools", async () => {
  const res = await handleMessage({ jsonrpc: "2.0", id: 2, method: "tools/list" });
  assert.deepEqual(res.result.tools.map((t) => t.name), ["dispatch", "code_search", "research"]);
});

test("tools/list and tools/call honor safe permission profile", async () => {
  const saved = process.env.CSW_PERMISSION_PROFILE;
  process.env.CSW_PERMISSION_PROFILE = "safe";
  try {
    const list = await handleMessage({ jsonrpc: "2.0", id: 20, method: "tools/list" });
    assert.deepEqual(list.result.tools.map((t) => t.name), ["code_search", "research"]);
    const dispatch = await handleMessage({ jsonrpc: "2.0", id: 21, method: "tools/call", params: { name: "dispatch", arguments: { tasks: [{ prompt: "x" }] } } });
    assert.equal(dispatch.result.isError, true);
    assert.match(dispatch.result.content[0].text, /disabled by permission profile/);
  } finally {
    if (saved === undefined) delete process.env.CSW_PERMISSION_PROFILE; else process.env.CSW_PERMISSION_PROFILE = saved;
  }
});

test("notifications/initialized produces no reply", async () => {
  assert.equal(await handleMessage({ jsonrpc: "2.0", method: "notifications/initialized" }), null);
});

test("unknown method with id returns method-not-found", async () => {
  const res = await handleMessage({ jsonrpc: "2.0", id: 3, method: "bogus" });
  assert.equal(res.error.code, -32601);
});

test("protocol and dispatch errors redact secret-like request strings", async () => {
  const secret = "ghp_" + "A".repeat(36);
  const missing = await handleMessage({ jsonrpc: "2.0", id: 33, method: `bogus-${secret}` });
  assert.doesNotMatch(missing.error.message, new RegExp(secret));
  const tool = await handleMessage({ jsonrpc: "2.0", id: 34, method: "tools/call", params: { name: `nope-${secret}`, arguments: {} } });
  assert.doesNotMatch(tool.result.content[0].text, new RegExp(secret));
});

test("invalid request shape returns invalid-request when it has an id", async () => {
  const res = await handleMessage({ id: 4, method: "x" }); // missing jsonrpc
  assert.equal(res.error.code, -32600);
});

test("id:null is a request (per JSON-RPC), not a notification", async () => {
  const res = await handleMessage({ jsonrpc: "2.0", id: null, method: "ping" });
  assert.notEqual(res, null);
  assert.deepEqual(res.result, {});
});

test("tools/call dispatch returns content with results (mocked worker)", async () => {
  const res = await handleMessage(
    { jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "dispatch", arguments: { tasks: [{ prompt: "x" }] } } },
    { spawnImpl: fakeSpawn({ stdout: "worker-said-hi" }) },
  );
  assert.ok(!res.result.isError);
  const text = res.result.content[0].text;
  assert.match(text, /worker-said-hi/);
  assert.match(text, /summary/);
});

test("tools/call redacts worker output in MCP content", async () => {
  const secret = "ghp_" + "A".repeat(36);
  const res = await handleMessage(
    { jsonrpc: "2.0", id: 55, method: "tools/call", params: { name: "dispatch", arguments: { tasks: [{ prompt: "x" }] } } },
    { spawnImpl: fakeSpawn({ stdout: `worker ${secret}` }) },
  );
  const text = res.result.content[0].text;
  assert.doesNotMatch(text, new RegExp(secret));
  assert.match(text, /REDACTED/);
});

test("tools/call with bad args returns isError content (not a crash)", async () => {
  const res = await handleMessage(
    { jsonrpc: "2.0", id: 6, method: "tools/call", params: { name: "code_search", arguments: {} } },
    { spawnImpl: fakeSpawn() },
  );
  assert.equal(res.result.isError, true);
  assert.match(res.result.content[0].text, /dispatch error/);
});

// --- End-to-end: real server process over stdio with a fake worker binary ---
test("e2e: server speaks newline-delimited JSON-RPC over stdio", async () => {
  const dir = mkdtempSync(join(tmpdir(), "csw-srv-"));
  try {
    // Fake worker: ignores args, prints a marker, exits 0.
    const worker = join(dir, "fake-worker.mjs");
    writeFileSync(worker, "#!/usr/bin/env node\nprocess.stdout.write('FAKE_WORKER_DONE');\n");
    chmodSync(worker, 0o755);

    const server = join(repoRoot, "mcp/dispatch/server.mjs");
    const child = spawn(process.execPath, [server], {
      env: { ...process.env, CSW_DISPATCH_CMD: worker },
      stdio: ["pipe", "pipe", "pipe"],
    });

    const lines = [];
    let buf = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (d) => {
      buf += d;
      let nl;
      while ((nl = buf.indexOf("\n")) !== -1) {
        const l = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (l) lines.push(JSON.parse(l));
      }
    });

    const send = (obj) => child.stdin.write(JSON.stringify(obj) + "\n");
    send({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05" } });
    send({ jsonrpc: "2.0", method: "notifications/initialized" });
    send({ jsonrpc: "2.0", id: 2, method: "tools/list" });
    send({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "dispatch", arguments: { tasks: [{ prompt: "hi" }] } } });

    // wait for 3 responses (ids 1,2,3); the notification yields none
    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error(`timeout; got ${lines.length} responses`)), 8000);
      const iv = setInterval(() => {
        if (lines.length >= 3) { clearTimeout(t); clearInterval(iv); resolve(); }
      }, 20);
    });
    child.stdin.end();
    child.kill();

    const byId = Object.fromEntries(lines.filter((l) => l.id !== undefined).map((l) => [l.id, l]));
    assert.equal(byId[1].result.serverInfo.name, "csw-dispatch");
    assert.equal(byId[2].result.tools.length, 3);
    assert.match(byId[3].result.content[0].text, /FAKE_WORKER_DONE/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("e2e: server drains pending tools/call before exiting on stdin end", async () => {
  const dir = mkdtempSync(join(tmpdir(), "csw-srv-drain-"));
  try {
    const worker = join(dir, "fake-worker.mjs");
    writeFileSync(worker, "#!/usr/bin/env node\nsetTimeout(() => process.stdout.write('DRAINED_WORKER'), 25);\n");
    chmodSync(worker, 0o755);
    const server = join(repoRoot, "mcp/dispatch/server.mjs");
    const child = spawn(process.execPath, [server], { env: { ...process.env, CSW_DISPATCH_CMD: worker }, stdio: ["pipe", "pipe", "pipe"] });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "code_search", arguments: { queries: ["x"] } } }) + "\n");
    child.stdin.end();
    const code = await new Promise((resolve) => child.on("close", resolve));
    assert.equal(code, 0);
    assert.match(out, /DRAINED_WORKER/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
