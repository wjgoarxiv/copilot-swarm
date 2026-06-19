#!/usr/bin/env node
// Release preflight: version lockstep + package payload readiness.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { SERVER_INFO } from "../mcp/dispatch/server.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(repoRoot, p), "utf8");
const readJson = (p) => JSON.parse(read(p));

const LOCAL_ARTIFACTS = [".csw", ".csw-qa", "." + "om" + "o", ".litopen" + "code", "plans", "HANDOFF.md", "# REFERENCE"];
const isLocalArtifact = (path) => LOCAL_ARTIFACTS.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));

export function packFiles(cwd = repoRoot) {
  const out = execFileSync("npm", ["pack", "--dry-run", "--json"], { cwd, encoding: "utf8" });
  const json = JSON.parse(out);
  return (Array.isArray(json) ? json[0] : json).files.map((f) => f.path);
}

function localLinks(markdown) {
  const links = new Set();
  for (const m of markdown.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) links.add(m[1]);
  for (const m of markdown.matchAll(/<img\s+[^>]*src=["']([^"']+)["']/gi)) links.add(m[1]);
  return [...links]
    .map((raw) => raw.split("#", 1)[0].split("?", 1)[0])
    .filter((href) => href && !/^[a-z][a-z0-9+.-]*:/i.test(href) && !href.startsWith("#"))
    .map((href) => normalize(href.replace(/^\.\//, "")).replace(/\\/g, "/"));
}

export function runReleaseCheck(cwd = repoRoot) {
  const errors = [];
  const pkg = readJson("package.json");
  const version = pkg.version;
  const primary = readJson(".plugin/plugin.json");
  const github = readJson(".github/plugin/plugin.json");
  const changelog = read("CHANGELOG.md");
  const readme = read("README.md");
  const readmeKo = read("README-Ko-KR.md");

  for (const [name, actual] of [
    [".plugin/plugin.json", primary.version],
    [".github/plugin/plugin.json", github.version],
    ["mcp/dispatch/server.mjs SERVER_INFO.version", SERVER_INFO.version],
  ]) {
    if (actual !== version) errors.push(`${name} version ${actual} != package.json ${version}`);
  }
  if (!new RegExp(`^## \\[${version.replaceAll(".", "\\.")}\\] - \\d{4}-\\d{2}-\\d{2}$`, "m").test(changelog)) {
    errors.push(`CHANGELOG.md top release must include ${version} with an ISO date`);
  }
  for (const [name, text] of [["README.md", readme], ["README-Ko-KR.md", readmeKo]]) {
    for (const m of text.matchAll(/copilot-swarm-(\d+\.\d+\.\d+)\.tgz/g)) {
      if (m[1] !== version) errors.push(`${name} references tarball version ${m[1]} != ${version}`);
    }
  }

  const files = packFiles(cwd);
  const fileSet = new Set(files);
  for (const doc of ["README.md", "README-Ko-KR.md", "CHANGELOG.md"]) {
    for (const link of localLinks(read(doc))) {
      if (!existsSync(join(repoRoot, link))) errors.push(`${doc} links missing local target ${link}`);
      else if (!fileSet.has(link) && !files.some((f) => f.startsWith(`${link.replace(/\/$/, "")}/`))) {
        errors.push(`${doc} links ${link}, but it is not included in npm pack payload`);
      }
    }
  }
  for (const forbidden of files.filter((f) => isLocalArtifact(f))) {
    errors.push(`local/private artifact must not ship: ${forbidden}`);
  }
  return { ok: errors.length === 0, version, files, errors };
}

function run() {
  const result = runReleaseCheck();
  if (!result.ok) {
    console.error(result.errors.map((e) => `FAIL: ${e}`).join("\n"));
    process.exit(1);
  }
  console.log(`OK: release preflight clean for copilot-swarm@${result.version} (${result.files.length} pack files).`);
}

function isMainModule() {
  if (!process.argv[1]) return false;
  try { return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]); }
  catch { return fileURLToPath(import.meta.url) === process.argv[1]; }
}
if (isMainModule()) run();
