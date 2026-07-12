import { createHash } from "node:crypto";
import { closeSync, constants, fstatSync, openSync, readSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";

export const RECEIPT_VERSION = 1;
export const RECEIPT_TRUST_BOUNDARY = "This receipt detects ordinary staleness but does not authenticate state against a malicious same-user editor.";

const HASH_RE = /^[a-f0-9]{64}$/;
const ERROR_CODES = new Set([
  "E2BIG", "EACCES", "EAGAIN", "EBADF", "EFAULT", "EINVAL", "EIO", "EISDIR", "ELOOP", "EMFILE",
  "ENAMETOOLONG", "ENFILE", "ENOENT", "ENOEXEC", "ENOMEM", "ENOTDIR", "EPERM", "ETIMEDOUT", "ENOBUFS",
  "SPAWN_ERROR", "RUNNER_TIMEOUT", "RUNNER_ERROR", "PROCESS_TREE_LIMIT", "WORKSPACE_FINGERPRINT_UNAVAILABLE",
]);
const SIGNALS = new Set(["SIGABRT", "SIGALRM", "SIGBREAK", "SIGHUP", "SIGINT", "SIGKILL", "SIGPIPE", "SIGQUIT", "SIGSEGV", "SIGTERM", "SIGUSR1", "SIGUSR2", "SIGWINCH"]);

function exactObject(value, keys) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  return actual.length === keys.length && actual.every((key, index) => key === [...keys].sort()[index]);
}

const integer = (value, min = 0, max = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(value) && value >= min && value <= max;
const hashValue = (value) => typeof value === "string" && HASH_RE.test(value);

function validStream(value) {
  return exactObject(value, ["bytes", "sha256"]) && integer(value.bytes) && hashValue(value.sha256);
}

function validOutput(value) {
  if (!(exactObject(value, ["limitBytes", "limitExceeded", "truncated", "stdout", "stderr"])
    && integer(value.limitBytes, 1, 64 * 1024 * 1024)
    && typeof value.limitExceeded === "boolean"
    && typeof value.truncated === "boolean"
    && validStream(value.stdout)
    && validStream(value.stderr))) return false;
  const exceeded = value.stdout.bytes + value.stderr.bytes > value.limitBytes;
  return value.limitExceeded === exceeded && value.truncated === exceeded;
}

function validWorkspace(value) {
  if (!value || value.version !== 1 || typeof value.available !== "boolean") return false;
  if (!value.available) {
    return exactObject(value, ["version", "available", "reason"])
      && ["not-git", "fingerprint-limit", "fingerprint-error"].includes(value.reason);
  }
  return exactObject(value, ["version", "available", "scope", "head", "trackedStatusSha256", "trackedDiffSha256", "untracked"])
    && value.scope === "git-visible"
    && typeof value.head === "string" && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(value.head)
    && hashValue(value.trackedStatusSha256)
    && hashValue(value.trackedDiffSha256)
    && exactObject(value.untracked, ["count", "namesSha256", "contentSha256", "totalBytes"])
    && integer(value.untracked.count, 0, 1_000)
    && integer(value.untracked.totalBytes, 0, 4 * 1024 * 1024)
    && hashValue(value.untracked.namesSha256)
    && hashValue(value.untracked.contentSha256);
}

function validTimestamp(value) {
  if (typeof value !== "string" || value.length > 40 || !Number.isFinite(Date.parse(value))) return false;
  try { return new Date(value).toISOString() === value; } catch { return false; }
}

function validVerify(receipt) {
  return exactObject(receipt, [
    "type", "receiptVersion", "argv0Sha256", "argumentCount", "argvSha256", "criterionRevision",
    "exitCode", "signal", "timedOut", "errorCode", "durationMs", "timeoutMs", "output", "workspace", "at",
  ])
    && receipt.type === "verify"
    && receipt.receiptVersion === RECEIPT_VERSION
    && hashValue(receipt.argv0Sha256)
    && integer(receipt.argumentCount, 0, 1_000_000)
    && hashValue(receipt.argvSha256)
    && integer(receipt.criterionRevision)
    && (receipt.exitCode === null || integer(receipt.exitCode, 0, 255))
    && (receipt.signal === null || SIGNALS.has(receipt.signal))
    && typeof receipt.timedOut === "boolean"
    && (receipt.errorCode === null || ERROR_CODES.has(receipt.errorCode))
    && integer(receipt.durationMs)
    && integer(receipt.timeoutMs, 1, 300_000)
    && validOutput(receipt.output)
    && validWorkspace(receipt.workspace)
    && validTimestamp(receipt.at);
}

function validArtifact(receipt) {
  return exactObject(receipt, ["type", "receiptVersion", "path", "size", "sha256", "device", "inode", "summary", "criterionRevision", "at"])
    && receipt.type === "artifact"
    && receipt.receiptVersion === RECEIPT_VERSION
    && typeof receipt.path === "string" && receipt.path.length > 0 && receipt.path.length <= 4096 && !isAbsolute(receipt.path) && !receipt.path.split(/[\\/]/).includes("..")
    && integer(receipt.size, 1)
    && hashValue(receipt.sha256)
    && integer(receipt.device)
    && integer(receipt.inode)
    && typeof receipt.summary === "string" && receipt.summary.trim().length > 0 && receipt.summary.length <= 500
    && integer(receipt.criterionRevision)
    && validTimestamp(receipt.at);
}

export function validateReceipt(receipt) {
  const valid = receipt?.type === "verify" ? validVerify(receipt) : receipt?.type === "artifact" ? validArtifact(receipt) : false;
  return valid ? { valid: true } : { valid: false, reason: "receipt schema is invalid" };
}

function containedRelative(root, candidate) {
  const rel = relative(root, candidate);
  if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new Error("artifact must be within cwd");
  return rel;
}

function sameIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino;
}

function hashOpenFile(path, expected) {
  const fd = openSync(path, constants.O_RDONLY | constants.O_NONBLOCK);
  try {
    const before = fstatSync(fd);
    if (!sameIdentity(before, expected)) throw new Error("artifact identity changed before hashing");
    if (!before.isFile() || before.size <= 0) throw new Error("artifact must be a nonempty regular file");
    const hash = createHash("sha256");
    const buffer = Buffer.allocUnsafe(64 * 1024);
    let offset = 0;
    while (offset < before.size) {
      const read = readSync(fd, buffer, 0, Math.min(buffer.length, before.size - offset), offset);
      if (read === 0) break;
      hash.update(buffer.subarray(0, read));
      offset += read;
    }
    const after = fstatSync(fd);
    if (offset !== before.size || after.size !== before.size || after.mtimeMs !== before.mtimeMs) {
      throw new Error("artifact changed while it was being hashed");
    }
    if (!sameIdentity(before, after)) throw new Error("artifact identity changed while it was being hashed");
    return { size: before.size, sha256: hash.digest("hex"), device: before.dev, inode: before.ino };
  } finally {
    closeSync(fd);
  }
}

export function inspectArtifact(cwd, inputPath) {
  if (typeof inputPath !== "string" || !inputPath.trim()) throw new Error("artifact path is required");
  const rootAbsolute = resolve(cwd);
  const rootReal = realpathSync(rootAbsolute);
  const candidateAbsolute = resolve(rootAbsolute, inputPath);
  const storedPath = containedRelative(rootAbsolute, candidateAbsolute);
  let candidateReal;
  try {
    candidateReal = realpathSync(candidateAbsolute);
  } catch (error) {
    if (error?.code === "ENOENT") throw new Error("artifact must be a nonempty regular file");
    throw error;
  }
  containedRelative(rootReal, candidateReal);
  const candidateStat = statSync(candidateReal);
  if (!candidateStat.isFile() || candidateStat.size <= 0) throw new Error("artifact must be a nonempty regular file");
  const metadata = hashOpenFile(candidateReal, candidateStat);
  const finalStat = statSync(candidateReal);
  if (realpathSync(candidateAbsolute) !== candidateReal || !finalStat.isFile() || finalStat.dev !== metadata.device || finalStat.ino !== metadata.inode) {
    throw new Error("artifact changed while it was being hashed");
  }
  return { path: storedPath.split(sep).join("/"), ...metadata };
}

export function validateArtifactReceipt(receipt, cwd) {
  if (!cwd) return { valid: false, reason: "artifact cannot be validated without cwd" };
  try {
    const current = inspectArtifact(cwd, receipt.path);
    if (current.device !== receipt.device || current.inode !== receipt.inode) return { valid: false, reason: "artifact identity changed" };
    if (current.size !== receipt.size) return { valid: false, reason: `artifact size changed (${receipt.size} -> ${current.size})` };
    if (current.sha256 !== receipt.sha256) return { valid: false, reason: "artifact SHA-256 changed" };
    return { valid: true };
  } catch (error) {
    return { valid: false, reason: `artifact validation failed: ${error.message}` };
  }
}
