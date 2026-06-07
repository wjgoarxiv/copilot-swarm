import { test } from "node:test";
import assert from "node:assert/strict";
import { parse, palette, banner, doctor, statusReport, main } from "../bin/csw.mjs";
import { doctrine } from "../hooks/session-doctrine.mjs";

test("parse: defaults and options", () => {
  assert.deepEqual(parse([]), { cmd: "status", theme: "violet", color: true });
  assert.equal(parse(["install"]).cmd, "install");
  assert.equal(parse(["--theme", "ocean"]).theme, "ocean");
  assert.equal(parse(["--theme", "bogus"]).theme, "violet"); // unknown -> default
  assert.equal(parse(["--no-color"]).color, false);
});

test("palette: no-color yields empty codes; color yields ansi", () => {
  assert.equal(palette("violet", false).primary, "");
  assert.ok(palette("violet", true).primary.includes("\x1b["));
});

test("banner: contains product name + package version, color-free when disabled", () => {
  const b = banner("mono", false);
  assert.match(b, /Copilot-swarm/);
  assert.match(b, /v0\.1\.0/); // synced from package.json
  assert.ok(!b.includes("\x1b["));
});

test("doctor: reports node, copilot presence, plugin state (injected run)", () => {
  const run = (cmd) => {
    if (cmd[1] === "--version") return { ok: true, out: "GitHub Copilot CLI 1.0.60\n" };
    if (cmd[1] === "plugin") return { ok: true, out: "Installed plugins:\n  copilot-swarm (v0.1.0)\n" };
    return { ok: false, out: "" };
  };
  const d = doctor(run);
  assert.match(d.node, /^v\d+/);
  assert.match(d.copilot, /Copilot CLI/);
  assert.equal(d.pluginInstalled, true);
});

test("doctor: no copilot -> null + not installed", () => {
  const d = doctor(() => ({ ok: false, out: "" }));
  assert.equal(d.copilot, null);
  assert.equal(d.pluginInstalled, false);
});

test("statusReport: renders checks and skills/agents", () => {
  const r = statusReport({ node: "v22", copilot: "x", pluginInstalled: false }, false, "violet");
  assert.match(r, /GitHub Copilot CLI/);
  assert.match(r, /not installed — run: csw install/);
  assert.match(r, /swarm · csw-plan · csw-work · csw-review/);
});

test("main: help and doctor return 0", () => {
  assert.equal(main(["help"]), 0);
  assert.equal(main(["doctor"]), 0);
});

test("doctrine: injects the runtime command so the model can call it", () => {
  const d = doctrine(() => "DOCTRINE BODY", 'node "/abs/path with space/bin/csw-runtime.mjs"');
  assert.match(d, /node "\/abs\/path with space\/bin\/csw-runtime\.mjs" <subcommand>/);
  assert.match(d, /not on PATH/);
});

test("doctrine: default runtime command quotes the path (spaces-safe)", () => {
  const d = doctrine(() => "BODY");
  assert.match(d, /node "[^"]*csw-runtime\.mjs"/); // path is quoted
});
