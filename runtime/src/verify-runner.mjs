import { createHash } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";

const EMPTY_SHA256 = createHash("sha256").digest("hex");
const SLEEP = new Int32Array(new SharedArrayBuffer(4));
const MAX_TRACKED_DESCENDANTS = 4_096;
const SPAWN_ERROR_CODES = new Set(["E2BIG", "EACCES", "EAGAIN", "EBADF", "EFAULT", "EINVAL", "EIO", "EISDIR", "ELOOP", "EMFILE", "ENAMETOOLONG", "ENFILE", "ENOENT", "ENOEXEC", "ENOMEM", "ENOTDIR", "EPERM"]);

function safeErrorCode(error) {
  return SPAWN_ERROR_CODES.has(error?.code) ? error.code : "SPAWN_ERROR";
}

function processIsAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code !== "ESRCH";
  }
}

function detailedProcessTable() {
  const result = spawnSync("ps", ["-axo", "pid=,ppid=,pgid=,lstart="], {
    shell: false,
    encoding: "utf8",
    timeout: 1_000,
    maxBuffer: 1024 * 1024,
    windowsHide: true,
  });
  if (result.error || result.status !== 0) return new Map();
  const table = new Map();
  for (const line of result.stdout.split("\n")) {
    const match = line.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s+(.+)$/);
    if (!match) continue;
    const pid = Number(match[1]);
    table.set(pid, { pid, ppid: Number(match[2]), pgid: Number(match[3]), start: match[4] });
  }
  return table;
}

function descendantsOf(rootPid, table) {
  const children = new Map();
  for (const record of table.values()) {
    if (!children.has(record.ppid)) children.set(record.ppid, []);
    children.get(record.ppid).push(record.pid);
  }
  const descendants = [];
  const queue = [...(children.get(rootPid) || [])];
  while (queue.length) {
    const pid = queue.shift();
    if (table.has(pid)) descendants.push(table.get(pid));
    queue.push(...(children.get(pid) || []));
  }
  return descendants;
}

function sameProcess(current, observed) {
  if (!current || !observed) return false;
  if (current.pid !== observed.pid) return false;
  return current.start === observed.start;
}

function killPosixTree(child, tracked, collect, rootIdentity) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    collect();
    const table = detailedProcessTable();
    for (const observed of [...tracked.values()].reverse()) {
      const current = table.get(observed.pid);
      if (!sameProcess(current, observed)) continue;
      if (current.pgid === current.pid) {
        try { process.kill(-current.pid, "SIGKILL"); } catch {}
      }
      try { process.kill(current.pid, "SIGKILL"); } catch {}
    }
    const currentRoot = table.get(child.pid);
    if (sameProcess(currentRoot, rootIdentity)) {
      if (currentRoot.pgid === currentRoot.pid) {
        try { process.kill(-currentRoot.pid, "SIGKILL"); } catch {}
      }
      try { process.kill(currentRoot.pid, "SIGKILL"); } catch {}
    }
    Atomics.wait(SLEEP, 0, 0, 25);
  }
  if (!rootIdentity) {
    try { child.kill("SIGKILL"); } catch {}
  }
}

function killTree(child, tracked, collect, rootIdentity) {
  if (!child?.pid) return;
  if (process.platform === "win32") {
    try {
      spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
        shell: false,
        stdio: "ignore",
        timeout: 5_000,
        windowsHide: true,
      });
    } catch {}
    try { child.kill("SIGKILL"); } catch {}
  } else {
    killPosixTree(child, tracked, collect, rootIdentity);
  }
}

function run({ argv, cwd, timeoutMs, outputLimitBytes, parentPid }) {
  return new Promise((resolve) => {
    const started = Date.now();
    const streams = {
      stdout: { bytes: 0, hash: createHash("sha256") },
      stderr: { bytes: 0, hash: createHash("sha256") },
    };
    let timedOut = false;
    let limitExceeded = false;
    let errorCode = null;
    let terminating = false;
    let child;
    const tracked = new Map();
    let rootIdentity = null;
    let treeTimer = null;

    // Best-effort containment for trusted verify commands, not a security
    // sandbox. Only PIDs observed as descendants (plus matching start identity)
    // are retained; no command line or environment data is inspected/persisted.
    const collect = () => {
      if (!child?.pid || process.platform === "win32") return;
      const table = detailedProcessTable();
      if (!rootIdentity && table.has(child.pid)) rootIdentity = table.get(child.pid);
      for (const record of descendantsOf(child.pid, table)) {
        if (!tracked.has(record.pid) && tracked.size >= MAX_TRACKED_DESCENDANTS) {
          terminate("PROCESS_TREE_LIMIT");
          return;
        }
        tracked.set(record.pid, record);
      }
    };

    const terminate = (code) => {
      if (terminating) return;
      terminating = true;
      errorCode = code;
      if (treeTimer) clearInterval(treeTimer);
      collect();
      killTree(child, tracked, collect, rootIdentity);
    };

    const consume = (name, chunk) => {
      streams[name].bytes += chunk.length;
      streams[name].hash.update(chunk);
      if (streams.stdout.bytes + streams.stderr.bytes > outputLimitBytes) {
        limitExceeded = true;
        terminate("ENOBUFS");
      }
    };

    try {
      child = spawn(argv[0], argv.slice(1), {
        cwd,
        env: process.env,
        shell: false,
        detached: true,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      });
    } catch (error) {
      resolve({
        exitCode: null,
        signal: null,
        timedOut: false,
        errorCode: safeErrorCode(error),
        durationMs: Date.now() - started,
        output: {
          limitBytes: outputLimitBytes,
          limitExceeded: false,
          truncated: false,
          stdout: { bytes: 0, sha256: EMPTY_SHA256 },
          stderr: { bytes: 0, sha256: EMPTY_SHA256 },
        },
      });
      return;
    }

    child.stdout.on("data", (chunk) => consume("stdout", chunk));
    child.stderr.on("data", (chunk) => consume("stderr", chunk));
    child.on("error", (error) => { if (!errorCode) errorCode = safeErrorCode(error); });
    collect();
    treeTimer = setInterval(collect, 25);

    const timer = setTimeout(() => {
      if (terminating) return;
      timedOut = true;
      terminate("ETIMEDOUT");
    }, timeoutMs);
    const parentTimer = setInterval(() => {
      if (!processIsAlive(parentPid)) terminate("PARENT_EXITED");
    }, 50);

    child.on("close", (exitCode, signal) => {
      clearTimeout(timer);
      clearInterval(parentTimer);
      clearInterval(treeTimer);
      resolve({
        exitCode: Number.isInteger(exitCode) ? exitCode : null,
        signal: signal || null,
        timedOut,
        errorCode,
        durationMs: Date.now() - started,
        output: {
          limitBytes: outputLimitBytes,
          limitExceeded,
          truncated: limitExceeded,
          stdout: { bytes: streams.stdout.bytes, sha256: streams.stdout.hash.digest("hex") },
          stderr: { bytes: streams.stderr.bytes, sha256: streams.stderr.hash.digest("hex") },
        },
      });
    });
  });
}

let input = "";
process.stdin.setEncoding("utf8");
process.stdout.on("error", () => { process.exitCode = 0; });
process.stdin.on("data", (chunk) => { input += chunk; });
process.stdin.on("end", async () => {
  try {
    const payload = JSON.parse(input);
    const result = await run(payload);
    process.stdout.write(JSON.stringify(result));
  } catch {
    process.stdout.write(JSON.stringify({ runnerErrorCode: "INVALID_RUNNER_INPUT" }));
    process.exitCode = 1;
  }
});
