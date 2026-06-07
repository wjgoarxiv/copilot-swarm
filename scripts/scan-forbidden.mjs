#!/usr/bin/env node
// Forbidden-token scanner CLI — the release-cleanliness oracle.
//
// Usage:
//   node scripts/scan-forbidden.mjs [--surface tracked|packable|tarball|all]
//   node scripts/scan-forbidden.mjs --paths <file> [<file> ...]
//
// Exit codes: 0 = clean, 1 = forbidden tokens found, 2 = operational error.

import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, existsSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { scanFileList, formatFindings } from "./scanner-core.mjs";

function parseArgs(argv) {
  const args = { surface: "all", paths: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--surface") args.surface = argv[++i];
    else if (a === "--paths") {
      args.paths = [];
      while (i + 1 < argv.length && !argv[i + 1].startsWith("--")) args.paths.push(argv[++i]);
    }
  }
  return args;
}

/** Files tracked by git. */
export function collectTracked(cwd = process.cwd()) {
  const out = execFileSync("git", ["ls-files", "-z"], { cwd, encoding: "utf8" });
  return out.split("\0").filter(Boolean).map((p) => join(cwd, p));
}

/** Files npm would include in the package (without building a tarball). */
export function collectPackable(cwd = process.cwd()) {
  const out = execFileSync("npm", ["pack", "--dry-run", "--json"], { cwd, encoding: "utf8" });
  const json = JSON.parse(out);
  const entry = Array.isArray(json) ? json[0] : json;
  return (entry.files || []).map((f) => join(cwd, f.path));
}

/**
 * Files actually written into the npm tarball. Builds the tarball, extracts it
 * to a temp dir, returns the extracted file paths plus a cleanup() thunk.
 */
export function collectTarball(cwd = process.cwd()) {
  const out = execFileSync("npm", ["pack", "--json"], { cwd, encoding: "utf8" });
  const json = JSON.parse(out);
  const entry = Array.isArray(json) ? json[0] : json;
  const tgz = join(cwd, entry.filename);
  const dir = mkdtempSync(join(tmpdir(), "csw-pack-"));
  const cleanup = () => {
    try { rmSync(dir, { recursive: true, force: true }); } catch {}
    try { if (existsSync(tgz)) rmSync(tgz, { force: true }); } catch {}
  };
  let list;
  try {
    execFileSync("tar", ["-xzf", tgz, "-C", dir], { encoding: "utf8" });
    list = execFileSync("tar", ["-tzf", tgz], { encoding: "utf8" })
      .split("\n").filter(Boolean);
  } catch (err) {
    cleanup();
    throw err;
  }
  // Scan extracted file contents; also include the in-tarball entry names so a
  // forbidden token in a packaged path is caught even if the working-tree path differs.
  const files = list
    .filter((name) => !name.endsWith("/"))
    .map((name) => join(dir, name));
  return { files: [...files, ...list], cleanup };
}

function run() {
  const { surface, paths } = parseArgs(process.argv.slice(2));
  const surfaces = surface === "all" ? ["tracked", "packable", "tarball"] : [surface];
  let total = 0;

  try {
    if (paths) {
      const findings = scanFileList(paths);
      report("explicit paths", findings);
      total += findings.length;
    } else {
      for (const s of surfaces) {
        if (s === "tracked") {
          const findings = scanFileList(collectTracked());
          report("tracked", findings);
          total += findings.length;
        } else if (s === "packable") {
          const findings = scanFileList(collectPackable());
          report("packable", findings);
          total += findings.length;
        } else if (s === "tarball") {
          const { files, cleanup } = collectTarball();
          try {
            const findings = scanFileList(files);
            report("tarball", findings);
            total += findings.length;
          } finally {
            cleanup();
          }
        } else {
          console.error(`unknown surface: ${s}`);
          process.exit(2);
        }
      }
    }
  } catch (err) {
    console.error(`scan error: ${err.message}`);
    process.exit(2);
  }

  if (total > 0) {
    console.error(`\nFAIL: ${total} forbidden-token finding(s).`);
    process.exit(1);
  }
  console.log("OK: no forbidden tokens.");
  process.exit(0);
}

function report(surface, findings) {
  if (findings.length === 0) {
    console.log(`[${surface}] clean`);
  } else {
    console.error(`[${surface}] ${findings.length} finding(s):\n${formatFindings(findings)}`);
  }
}

// Run only when invoked directly (not when imported by tests). Compare the
// real (symlink-resolved) paths of both sides: fileURLToPath handles spaces /
// URL-encoding, and realpathSync handles symlinked dirs (e.g. /tmp -> /private/tmp)
// where import.meta.url is already realpath-resolved but argv[1] may not be.
function isMainModule() {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
  } catch {
    return fileURLToPath(import.meta.url) === process.argv[1];
  }
}
if (isMainModule()) run();
