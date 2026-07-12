import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { closeSync, constants, fstatSync, lstatSync, openSync, readSync, readlinkSync, realpathSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { verificationEnv } from "./redact.mjs";

const GIT_OUTPUT_LIMIT = 8 * 1024 * 1024;
const UNTRACKED_CONTENT_LIMIT = 4 * 1024 * 1024;
const UNTRACKED_FILE_LIMIT = 1_000;

const hash = (value) => createHash("sha256").update(value).digest("hex");

function unavailable(reason) {
  return { version: 1, available: false, reason };
}

function git(cwd, args) {
  return spawnSync("git", ["-C", cwd, ...args], {
    env: verificationEnv(),
    shell: false,
    encoding: null,
    timeout: 5_000,
    maxBuffer: GIT_OUTPUT_LIMIT,
    windowsHide: true,
  });
}

function commandBuffer(result) {
  if (result.error?.code === "ENOBUFS") throw new Error("fingerprint-limit");
  if (result.error || result.status !== 0) throw new Error("fingerprint-error");
  return Buffer.isBuffer(result.stdout) ? result.stdout : Buffer.from(result.stdout || "");
}

function isWithin(root, candidate) {
  const rel = relative(root, candidate);
  return rel === "" || (!isAbsolute(rel) && rel !== ".." && !rel.startsWith(`..${sep}`));
}

function splitNull(buffer) {
  const parts = [];
  let start = 0;
  for (let index = 0; index < buffer.length; index += 1) {
    if (buffer[index] !== 0) continue;
    if (index > start) parts.push(buffer.subarray(start, index));
    start = index + 1;
  }
  if (start < buffer.length) parts.push(buffer.subarray(start));
  return parts;
}

function hashUntracked(root, names, excludedStateRoot) {
  if (names.length > UNTRACKED_FILE_LIMIT) throw new Error("fingerprint-limit");
  const namesHash = createHash("sha256");
  const contentHash = createHash("sha256");
  let count = 0;
  let totalBytes = 0;
  for (const nameBuffer of names) {
    if (nameBuffer.length === 0) continue;
    const name = nameBuffer.toString("utf8");
    if (!Buffer.from(name).equals(nameBuffer)) throw new Error("fingerprint-error");
    const candidate = resolve(root, name);
    if (!isWithin(root, candidate)) throw new Error("fingerprint-error");
    if (excludedStateRoot && isWithin(excludedStateRoot, candidate)) continue;
    const stat = lstatSync(candidate);
    const prefix = Buffer.from(`${nameBuffer.length}:`);
    namesHash.update(prefix).update(nameBuffer);
    contentHash.update(prefix).update(nameBuffer);
    count += 1;
    if (stat.isSymbolicLink()) {
      const target = Buffer.from(readlinkSync(candidate));
      totalBytes += target.length;
      if (totalBytes > UNTRACKED_CONTENT_LIMIT) throw new Error("fingerprint-limit");
      contentHash.update(Buffer.from(`L:${stat.mode}:`)).update(target);
      continue;
    }
    if (!stat.isFile()) throw new Error("fingerprint-error");
    contentHash.update(Buffer.from(`F:${stat.mode}:`));
    totalBytes += stat.size;
    if (totalBytes > UNTRACKED_CONTENT_LIMIT) throw new Error("fingerprint-limit");
    const fd = openSync(candidate, constants.O_RDONLY | constants.O_NONBLOCK);
    try {
      const opened = fstatSync(fd);
      if (!opened.isFile() || opened.size !== stat.size || opened.dev !== stat.dev || opened.ino !== stat.ino) {
        throw new Error("fingerprint-error");
      }
      const buffer = Buffer.allocUnsafe(64 * 1024);
      let offset = 0;
      while (offset < opened.size) {
        const bytes = readSync(fd, buffer, 0, Math.min(buffer.length, opened.size - offset), offset);
        if (bytes === 0) throw new Error("fingerprint-error");
        contentHash.update(buffer.subarray(0, bytes));
        offset += bytes;
      }
      const after = fstatSync(fd);
      if (after.size !== opened.size || after.mtimeMs !== opened.mtimeMs || after.dev !== opened.dev || after.ino !== opened.ino) {
        throw new Error("fingerprint-error");
      }
    } finally {
      closeSync(fd);
    }
  }
  return {
    count,
    namesSha256: namesHash.digest("hex"),
    contentSha256: contentHash.digest("hex"),
    totalBytes,
  };
}

/**
 * Freshness fingerprint, not authentication: a malicious same-user process can
 * rewrite both workspace and state. `git-visible` covers tracked files and
 * non-ignored untracked files; ignored outputs require artifact receipts when
 * their integrity matters. Raw paths/diffs/content never leave memory.
 */
export function fingerprintWorkspace(cwd) {
  const top = git(cwd, ["rev-parse", "--show-toplevel"]);
  if (top.error) return unavailable("fingerprint-error");
  if (top.status !== 0) return unavailable("not-git");
  try {
    const root = realpathSync(commandBuffer(top).toString("utf8").trim());
    const head = commandBuffer(git(cwd, ["rev-parse", "--verify", "HEAD"])).toString("utf8").trim();
    const trackedStatus = commandBuffer(git(cwd, ["status", "--porcelain=v1", "-z", "--untracked-files=no"]));
    const trackedDiff = commandBuffer(git(cwd, ["diff", "--no-ext-diff", "--binary", "HEAD", "--"]));
    const untrackedRaw = commandBuffer(git(cwd, ["ls-files", "--full-name", "--others", "--exclude-standard", "-z"]));
    const configuredStateRoot = resolve(process.env.CSW_HOME || resolve(cwd, ".csw"));
    let stateRoot = configuredStateRoot;
    try { stateRoot = realpathSync(configuredStateRoot); } catch {}
    const excludedStateRoot = stateRoot !== root && isWithin(root, stateRoot) ? stateRoot : null;
    const untracked = hashUntracked(root, splitNull(untrackedRaw), excludedStateRoot);
    return {
      version: 1,
      available: true,
      scope: "git-visible",
      head,
      trackedStatusSha256: hash(trackedStatus),
      trackedDiffSha256: hash(trackedDiff),
      untracked,
    };
  } catch (error) {
    return unavailable(error?.message === "fingerprint-limit" ? "fingerprint-limit" : "fingerprint-error");
  }
}

export function sameWorkspaceFingerprint(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}
