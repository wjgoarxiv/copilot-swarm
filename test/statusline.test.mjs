import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { render } from "../bin/csw-statusline.mjs";
import { main } from "../bin/csw.mjs";
import * as rt from "../runtime/src/runtime.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const HUD = join(repoRoot, "bin/csw-statusline.mjs");

test("render: empty for no/empty goal (unobtrusive)", () => {
  assert.equal(render(null), "");
  assert.equal(render({ criteria: [] }), "");
});

test("render: shows criteria progress and objective", () => {
  const s = render({ objective: "ship the thing", criteria: [{ status: "pass" }, { status: "pending" }], reviewBlockers: [] });
  assert.match(s, /⚡ CSW/);
  assert.match(s, /1\/2 criteria/);
  assert.match(s, /ship the thing/);
});

test("render: shows blockers and failures", () => {
  const s = render({ objective: "x", criteria: [{ status: "fail" }], reviewBlockers: [{ resolved: false }, { resolved: false }] });
  assert.match(s, /✗1/);
  assert.match(s, /⛔ 2 blockers/);
});

test("render: singular blocker (no trailing s) and missing reviewBlockers key", () => {
  assert.match(render({ objective: "x", criteria: [{ status: "pass" }], reviewBlockers: [{ resolved: false }] }), /⛔ 1 blocker(?!s)/);
  // missing reviewBlockers must not crash and must show no blocker text
  const s = render({ objective: "x", criteria: [{ status: "pass" }] });
  assert.ok(!/blocker/.test(s));
});

test("render: completed goal", () => {
  assert.match(render({ objective: "x", completed: true, criteria: [{ status: "pass" }] }), /✓ complete/);
});

test("render: truncates long objectives", () => {
  const long = "a".repeat(80);
  const s = render({ objective: long, criteria: [{ status: "pending" }] });
  assert.ok(s.includes("…"));
  assert.ok(!s.includes(long));
});

test("render: objective is redacted and single-line", () => {
  const secret = "ghp_" + "A".repeat(36);
  const s = render({ objective: `deploy\n${secret}\u001b[31m`, criteria: [{ status: "pending", evidence: secret }], reviewBlockers: [{ reason: secret, resolved: false }] });
  assert.doesNotMatch(s, /\n/);
  assert.doesNotMatch(s, new RegExp(secret));
  assert.match(s, /REDACTED/);
});

test("e2e: statusline reads .csw state for the cwd in stdin", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "csw-hud-"));
  try {
    rt.initGoal({ objective: "demo goal", criteriaText: "C001 | channel: cli | test: t | scenario: s" }, cwd);
    const out = await new Promise((resolve) => {
      const c = spawn(process.execPath, [HUD], { stdio: ["pipe", "pipe", "pipe"] });
      let o = ""; c.stdout.on("data", (d) => (o += d));
      c.on("close", () => resolve(o.trim()));
      c.stdin.write(JSON.stringify({ cwd })); c.stdin.end();
    });
    assert.match(out, /⚡ CSW · 0\/1 criteria · demo goal/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("e2e: malformed stdin yields empty output and exit 0 (fail-open)", async () => {
  const r = await new Promise((resolve) => {
    const c = spawn(process.execPath, [HUD], { stdio: ["pipe", "pipe", "pipe"] });
    let o = ""; c.stdout.on("data", (d) => (o += d));
    c.on("close", (code) => resolve({ code, out: o.trim() }));
    c.stdin.write("not json at all"); c.stdin.end();
  });
  assert.equal(r.code, 0);
  assert.equal(r.out, "");
});

test("csw hud: prints a statusLine settings snippet with the resolved path", () => {
  const logs = [];
  const orig = console.log;
  console.log = (...a) => logs.push(a.join(" "));
  try {
    assert.equal(main(["hud"]), 0);
  } finally {
    console.log = orig;
  }
  const text = logs.join("\n");
  assert.match(text, /statusLine/);
  assert.match(text, /csw-statusline\.mjs/);
});
