import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { renderInstallBanner } from "../scripts/postinstall.mjs";
import { scanText } from "../scripts/scanner-core.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = join(repoRoot, "scripts/postinstall.mjs");
const packageVersion = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")).version;

test("renderInstallBanner: contains wordmark, product, version, next steps", () => {
  const b = renderInstallBanner(true, packageVersion);
  assert.match(b, /copilot-swarm/);
  assert.match(b, new RegExp(`v${packageVersion.replaceAll(".", "\\.")}`));
  assert.match(b, /csw install/);
  assert.match(b, /evidence-gated delivery governance/i);
  assert.doesNotMatch(b, /parallel delegation/i);
  assert.ok(b.includes("\x1b["), "colored variant has ANSI");
});

test("renderInstallBanner: plain (no-color) has no ANSI", () => {
  const b = renderInstallBanner(false, packageVersion);
  assert.ok(!b.includes("\x1b["));
  assert.match(b, /copilot-swarm/);
});

test("renderInstallBanner is token-clean", () => {
  assert.deepEqual(scanText(renderInstallBanner(true)), []);
});

function run(env) {
  return new Promise((resolve) => {
    const c = spawn(process.execPath, [SCRIPT], { stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, ...env } });
    let o = ""; c.stdout.on("data", (d) => (o += d));
    c.on("close", (code) => resolve({ code, out: o }));
  });
}

test("postinstall: prints banner and exits 0 (non-CI)", async () => {
  const { code, out } = await run({ CI: "", npm_config_loglevel: "" });
  assert.equal(code, 0);
  assert.match(out, /copilot-swarm/);
});

test("postinstall: silent in CI (no noise), still exit 0", async () => {
  const { code, out } = await run({ CI: "true" });
  assert.equal(code, 0);
  assert.equal(out.trim(), "");
});

test("postinstall: silent when npm_config_loglevel=silent, still exit 0", async () => {
  const { code, out } = await run({ CI: "", npm_config_loglevel: "silent" });
  assert.equal(code, 0);
  assert.equal(out.trim(), "");
});

// --- docs ---
test("README references the cover and links the Korean version; both token-clean", () => {
  const en = readFileSync(join(repoRoot, "README.md"), "utf8");
  assert.match(en, /cover\.png/);
  assert.match(en, /README-Ko-KR\.md/);
  assert.match(en, /Quick Start|quick-start/i);
  assert.deepEqual(scanText(en), [], "README.md token-clean");
  assert.ok(existsSync(join(repoRoot, "README-Ko-KR.md")));
  const ko = readFileSync(join(repoRoot, "README-Ko-KR.md"), "utf8");
  assert.match(ko, /cover\.png/);
  assert.deepEqual(scanText(ko), [], "README-Ko-KR.md token-clean");
});

test("cover.png exists and is reasonably sized for a repo asset", () => {
  const p = join(repoRoot, "cover.png");
  assert.ok(existsSync(p), "cover.png must exist");
  const bytes = readFileSync(p).length;
  assert.ok(bytes > 1000 && bytes < 2_000_000, `cover.png size ${bytes} should be 1KB–2MB`);
});
