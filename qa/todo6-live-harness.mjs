import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { cleanPackedDir, validatePackedCandidate } from "../bin/csw.mjs";
import { runtimeCommand } from "../hooks/session-doctrine.mjs";
import { sanitizeLine } from "../runtime/src/redact.mjs";
import { validateReceipt } from "../runtime/src/receipts.mjs";
import { getState, initGoal, status } from "../runtime/src/runtime.mjs";

const NODE_PROGRAM = 'require("node:fs").writeFileSync(process.argv[1],"CSW_OK")';
const VERIFY_PROGRAM = 'const b=require("node:fs").readFileSync(process.argv[1]);if(b.length!==6||b.toString()!=="CSW_OK")process.exit(1)';
const DIFF_PROGRAM = 'const{execFileSync}=require("node:child_process");const o=execFileSync("git",["diff","--name-only",process.argv[1],"HEAD"],{encoding:"utf8"});if(o!=="result.txt\\n")process.exit(1)';
const CLEAN_PROGRAM = 'const{execFileSync}=require("node:child_process");const o=execFileSync("git",["status","--porcelain=v1","--untracked-files=all"],{encoding:"utf8"});if(o!=="")process.exit(1)';
const AVAILABLE_TOOLS = "bash,view,glob,rg,task,list_agents,read_agent,skill";
const OWNER_MARKER = ".csw-todo6-owned";
const SNAPSHOT_FILES = [
  ".plugin/plugin.json",
  ".github/plugin/plugin.json",
  "AGENTS.md",
  "bin/csw-runtime.mjs",
  "hooks/hooks.json",
  "hooks/session-doctrine.mjs",
  "runtime/src/runtime.mjs",
  "skills/csw-loop/SKILL.md",
];

function isInside(root, candidate) {
  const rel = relative(root, candidate);
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !rel.startsWith(sep));
}

function quoteShell(value) {
  return `'${String(value).replaceAll("'", `'"'"'`)}'`;
}

function canonical(path, label) {
  if (typeof path !== "string" || !path) throw new Error(`${label} path is required`);
  return realpathSync(path);
}

function git(cwd, args) {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function fileSha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function stagePackedPluginSnapshot({ repo, qa, state }) {
  const stageRoot = join(qa, ".csw", "plugin-snapshot");
  const packed = cleanPackedDir(repo, execFileSync, () => {
    mkdirSync(stageRoot, { recursive: true });
    return stageRoot;
  });
  try {
    const plugin = canonical(packed.dir, "plugin");
    if (!isInside(qa, plugin) || plugin === qa) throw new Error("plugin snapshot must be inside the QA root");
    const identity = validatePackedCandidate(plugin);
    const hashes = SNAPSHOT_FILES.map((path) => {
      const source = join(repo, path);
      const snapshot = join(plugin, path);
      if (!existsSync(source) || !existsSync(snapshot)) throw new Error(`missing package snapshot file: ${path}`);
      const sourceSha256 = fileSha256(source);
      const snapshotSha256 = fileSha256(snapshot);
      if (sourceSha256 !== snapshotSha256) throw new Error(`package snapshot hash mismatch: ${path}`);
      return { path, sourceSha256, snapshotSha256 };
    });
    const shown = JSON.parse(execFileSync(process.execPath, [join(plugin, "bin", "csw-runtime.mjs"), "show"], {
      cwd: qa,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }));
    if (shown.goalId !== state.goalId || shown.criteria?.length !== state.criteria.length) {
      throw new Error("package snapshot runtime did not observe the preinitialized goal");
    }
    for (const entry of readdirSync(stageRoot)) {
      if (entry.endsWith(".tgz")) rmSync(join(stageRoot, entry), { force: true });
    }
    return { plugin, pluginIdentity: identity, pluginHashes: hashes, pluginRuntimeGoalId: shown.goalId };
  } catch (error) {
    packed.cleanup();
    throw error;
  }
}

export function buildLiveTodo6Contract({ qa, writer, capture, repo, plugin, baseline, copilotHome, nodePath = process.execPath }) {
  if (!/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(String(baseline || ""))) {
    throw new Error("baseline must be a 40- or 64-character lowercase hex object id");
  }

  const roots = {
    qa: canonical(qa, "qa"),
    writer: canonical(writer, "writer"),
    capture: canonical(capture, "capture"),
    repo: canonical(repo, "repo"),
    plugin: canonical(plugin, "plugin"),
  };
  // Isolated Copilot state dir: keeps the user's installed plugins out of the run.
  // Auth lives in the system credential store, so a fresh home stays signed in.
  const isolatedCopilotHome = resolve(String(copilotHome || join(qa, "..", "copilot-home")));
  const node = canonical(nodePath, "node");
  if (new Set([roots.qa, roots.writer, roots.capture, roots.repo]).size !== 4) {
    throw new Error("live Todo 6 roots must be distinct");
  }
  if (isInside(roots.qa, roots.capture) || isInside(roots.writer, roots.capture)) {
    throw new Error("capture must be outside both git worktrees");
  }
  if (!isInside(roots.qa, roots.plugin) || roots.plugin === roots.qa) {
    throw new Error("plugin snapshot must be inside the QA root");
  }

  const resultPath = join(roots.writer, "result.txt");
  const integratedResultPath = join(roots.qa, "result.txt");
  const runtimePath = join(roots.plugin, "bin", "csw-runtime.mjs");
  const writerArgv = [node, "-e", NODE_PROGRAM, resultPath];
  // Copilot matches shell permissions on the command stem, so an absolute argv0
  // is not covered by shell(node:*). Serialize the stem and shell syntax tokens
  // plainly; quote only the values. The argv arrays keep the resolved path for
  // local execution and provenance.
  const shellArgv = (argv, stem, plainArgs = []) => {
    const plain = new Set(plainArgs);
    return [stem, ...argv.slice(1).map((arg) => plain.has(arg) ? String(arg) : quoteShell(arg))].join(" ");
  };
  const nodeShellArgv = (argv) => shellArgv(argv, "node", ["-e"]);
  const gitShellArgv = (argv) => shellArgv(argv, "git", ["-C", "add", "--", "commit", "-m", "cherry-pick"]);
  const writerShellCommand = nodeShellArgv(writerArgv);
  const writerCommitShellCommand = [
    gitShellArgv(["git", "-C", roots.writer, "add", "--", "result.txt"]),
    gitShellArgv(["git", "-C", roots.writer, "commit", "-m", "Todo 6 writer result"]),
  ].join(" && ");
  const resultVerifierArgv = [node, "-e", VERIFY_PROGRAM, resultPath];
  const resultVerifierShellCommand = nodeShellArgv(resultVerifierArgv);
  const runtimeShowArgv = [node, runtimePath, "show"];
  const integrateArgv = ["git", "cherry-pick", "todo6-writer"];
  // The verifier executes the nested argv through the runtime's trusted runner.
  // Keep that nested interpreter as the bare command stem so Copilot's
  // shell(node:*) rule can match the complete outer command.
  const verificationNode = "node";
  const criterionVerifyArgvs = [
    [node, runtimePath, "verify", "--id", "C001", "--", verificationNode, "-e", VERIFY_PROGRAM, integratedResultPath],
    [node, runtimePath, "verify", "--id", "C002", "--", verificationNode, "-e", DIFF_PROGRAM, baseline],
    [node, runtimePath, "verify", "--id", "C003", "--", verificationNode, "-e", CLEAN_PROGRAM],
  ];
  const runtimeCompleteArgv = [node, runtimePath, "complete"];
  const runtimeShellCommand = (argv) => {
    const args = argv.slice(2);
    const nestedSeparator = args.indexOf("--");
    const rendered = args.map((arg, index) => {
      const nestedInterpreter = nestedSeparator >= 0 && index === nestedSeparator + 1;
      const nestedFlag = nestedSeparator >= 0 && index === nestedSeparator + 2;
      return nestedInterpreter || nestedFlag ? String(arg) : quoteShell(arg);
    });
    return `${runtimeCommand(runtimePath)} ${rendered.join(" ")}`;
  };
  const requiredRootShellCommands = [
    runtimeShellCommand(runtimeShowArgv),
    resultVerifierShellCommand,
    gitShellArgv(integrateArgv),
    ...criterionVerifyArgvs.map(runtimeShellCommand),
    runtimeShellCommand(runtimeCompleteArgv),
  ];
  const logDir = join(roots.capture, "logs");
  const prompt = `csw

Mandatory order for this single bounded lifecycle run:
1. Use the injected absolute CSW runtime invocation with show and reuse the existing pending C001-C003 goal.
2. Stop if show does not report that preinitialized goal; do not call init or replace state.
3. Only after show succeeds, call the native task tool in mode sync for exactly two workers: one with agent_type "explorer" (the QA-local read-only project explorer) and one with agent_type "general-purpose" (the assigned writer). Use no other agent_type.

The capture directory is outside both git worktrees. Do not inspect, modify, or clean capture output from inside the Copilot run. The loaded plugin is a package-faithful snapshot inside the QA root at ${roots.plugin}; never use the source repository as a runtime path.

The project explorer is read-only with tools: [read, search]. The assigned writer owns only ${resultPath} and must use this exact shell-safe, prompt-approved command:
${writerShellCommand}
The same assigned writer must then commit that one file with this exact command:
${writerCommitShellCommand}
Run those two writer commands as two separate bash invocations in that order. Do not combine them into one shell call with &&, ;, or a newline.
The writer task must complete both ordered commands before returning and must report the commit SHA. A write without the commit is an incomplete writer task.
The root must never execute either writer command itself. If the writer task returns without the commit, stop and record a blocker; do not repair, repeat, copy, or commit from root.

Explorer observations are advisory and may reflect pre-writer state because the two tasks run concurrently. Do not treat explorer findings about refs or result.txt as a blocker; only the writer task completion and the prescribed root receipts establish the lifecycle state. After both tasks complete, follow root commands 2-7 exactly even if the explorer reports that a ref or result.txt is not yet present.

If the assigned writer fails or cannot mutate, the root must not perform the worker-owned mutation, must not launch another writer, and must not retry in this run. Add a runtime blocker, preserve the failure evidence, clean owned resources, and stop.

The root must run this complete command sequence exactly once and in this order; no other root bash command is permitted. Command 1 must complete before task dispatch, and commands 2-7 run only after both workers complete:
${requiredRootShellCommands.map((command, index) => `${index + 1}. ${command}`).join("\n")}
Each numbered item above is one separate root bash tool invocation. Issue command 1, wait for its completion, then issue command 2 in a new bash call, and continue one new bash call per number through command 7. The root command field must equal exactly one numbered item; never combine numbered items or use semicolon, &&, or a newline between root commands. If any command is denied or fails, stop and record the blocker.
Emit at most one root bash tool call per assistant turn. The tool runner may execute calls emitted in the same turn concurrently, so never emit multiple root bash calls together or pre-issue the next command. After each root command returns its tool result, stop and wait for a new assistant turn before emitting the next numbered command; commands 4, 5, and 6 must be strictly serialized this way.
The sequence verifies the writer bytes, integrates the writer branch, records machine verify receipts for C001 exact bytes, C002 the committed diff from ${baseline} names exactly result.txt, and C003 conductor cleanliness, then calls complete exactly once.

Do not create any other repository file. Do not use generic write permission, shell redirection, copy commands, remote Git operations, host configuration changes, plugin installation, retry, or root fallback mutation.`;

  const copilotArgs = [
    "-C", roots.qa,
    "--add-dir", roots.writer,
    "--plugin-dir", roots.plugin,
    "--no-remote",
    "--no-auto-update",
    "--disable-builtin-mcps",
    "--disallow-temp-dir",
    "--no-ask-user",
    `--available-tools=${AVAILABLE_TOOLS}`,
    "--allow-tool=shell(git:*)",
    "--allow-tool=shell(node:*)",
    "--deny-tool=shell(git push)",
    "--deny-tool=shell(git fetch)",
    "--deny-tool=shell(git pull)",
    "--deny-tool=shell(git clone)",
    "--deny-tool=shell(git remote)",
    "--deny-tool=shell(git reset)",
    "--deny-tool=shell(git clean)",
    "--max-ai-credits", "30",
    "--log-dir", logDir,
    "--output-format", "json",
    "-p", prompt,
  ];

  return {
    ...roots,
    copilotHome: isolatedCopilotHome,
    node,
    baseline,
    resultPath,
    integratedResultPath,
    writerArgv,
    writerShellCommand,
    writerCommitShellCommand,
    resultVerifierArgv,
    resultVerifierShellCommand,
    runtimeShowArgv,
    integrateArgv,
    criterionVerifyArgvs,
    runtimeCompleteArgv,
    requiredRootShellCommands,
    logDir,
    stdoutPath: join(roots.capture, "stdout.jsonl"),
    stderrPath: join(roots.capture, "stderr.txt"),
    hostTimeoutMs: 900_000,
    prompt,
    copilotArgs,
  };
}

export function prepareTodo6Run({ repo, baseDir = tmpdir(), nodePath = process.execPath, env = process.env } = {}) {
  if (typeof env.CSW_HOME === "string" && env.CSW_HOME) {
    throw new Error("CSW_HOME must be unset for an isolated Todo 6 run");
  }
  const repoRoot = canonical(repo, "repo");
  const runRoot = realpathSync(mkdtempSync(join(baseDir, "csw-todo6-")));
  const qa = join(runRoot, "qa");
  const writer = join(runRoot, "writer");
  const capture = join(runRoot, "capture");
  const copilotHome = join(runRoot, "copilot-home");
  try {
    mkdirSync(qa);
    mkdirSync(capture);
    mkdirSync(copilotHome);
    writeFileSync(join(copilotHome, "config.json"),
      `${JSON.stringify(isolatedCopilotConfig({ qa, writer, runRoot, baseConfig: readHostCopilotConfig(env) }), null, 2)}\n`);
    writeFileSync(join(runRoot, OWNER_MARKER), "owned by todo6-live-harness\n");
    mkdirSync(join(qa, ".github", "agents"), { recursive: true });
    writeFileSync(join(qa, ".gitignore"), ".csw/\n");
    writeFileSync(join(qa, ".github", "agents", "explorer.agent.md"), [
      "---",
      "name: explorer",
      "description: Read-only investigator for the bounded Todo 6 QA repository.",
      "tools: [read, search]",
      "---",
      "",
      "Inspect only the requested repository paths. Do not mutate files.",
      "",
    ].join("\n"));
    git(qa, ["init", "-b", "main"]);
    git(qa, ["config", "user.name", "CSW QA"]);
    git(qa, ["config", "user.email", "csw-qa@example.invalid"]);
    git(qa, ["add", ".gitignore", ".github/agents/explorer.agent.md"]);
    git(qa, ["commit", "-m", "Prepare bounded Todo 6 fixture"]);
    const baseline = git(qa, ["rev-parse", "HEAD"]).trim();
    git(qa, ["worktree", "add", "-b", "todo6-writer", writer, "main"]);

    const criteriaText = [
      "C001 | channel: cli | test: exact result bytes | scenario: result.txt bytes equal exactly CSW_OK",
      `C002 | channel: cli | test: git diff from ${baseline} | scenario: committed diff names exactly result.txt`,
      "C003 | channel: cli | test: git status porcelain | scenario: conductor repository is clean after integration",
    ].join("\n");
    initGoal({ objective: "Bounded Todo 6 worker lifecycle QA", criteriaText }, qa);
    const state = getState(qa);
    if (!state || state.criteria.length !== 3 || state.criteria.some((criterion) => criterion.status !== "pending")) {
      throw new Error("failed to preinitialize pending C001-C003 goal");
    }
    if (status(qa).done !== false) throw new Error("fresh Todo 6 goal must be incomplete");
    const snapshot = stagePackedPluginSnapshot({ repo: repoRoot, qa, state });
    if (git(qa, ["status", "--porcelain=v1", "--untracked-files=all"]) !== "") {
      throw new Error("prepared QA repository is not clean");
    }

    return {
      runRoot,
      ...snapshot,
      ...buildLiveTodo6Contract({ qa, writer, capture, repo: repoRoot, plugin: snapshot.plugin, baseline, copilotHome, nodePath }),
    };
  } catch (error) {
    if (existsSync(runRoot)) rmSync(runRoot, { recursive: true, force: true });
    throw error;
  }
}

export function cleanupTodo6Run(contract) {
  const runRoot = canonical(contract?.runRoot, "runRoot");
  const marker = join(runRoot, OWNER_MARKER);
  if (!existsSync(marker) || readFileSync(marker, "utf8") !== "owned by todo6-live-harness\n") {
    throw new Error("refusing cleanup without the Todo 6 ownership marker");
  }
  const ownedPath = (path, label) => {
    const lexical = resolve(String(path || ""));
    if (!isInside(runRoot, lexical)) throw new Error(`refusing cleanup for ${label} outside the owned run root`);
    if (!existsSync(lexical)) return lexical;
    const actual = canonical(lexical, label);
    if (!isInside(runRoot, actual)) throw new Error(`refusing cleanup for ${label} outside the owned run root`);
    return actual;
  };
  const qa = ownedPath(contract.qa, "qa");
  const writer = ownedPath(contract.writer, "writer");
  ownedPath(contract.capture, "capture");
  ownedPath(contract.plugin, "plugin");
  if (!isInside(runRoot, qa) || !isInside(runRoot, writer)) {
    throw new Error("refusing cleanup for paths outside the owned run root");
  }
  if (existsSync(qa)) {
    if (existsSync(writer)) git(qa, ["worktree", "remove", "--force", writer]);
    else git(qa, ["worktree", "prune", "--expire", "now"]);
    if (git(qa, ["worktree", "list", "--porcelain"]).split("\n").includes(`worktree ${writer}`)) {
      throw new Error("writer worktree registration remains after cleanup");
    }
  }
  rmSync(runRoot, { recursive: true });
  return !existsSync(runRoot);
}

function eventField(event, key) {
  return event?.[key] ?? event?.data?.[key];
}

function eventHasField(event, key) {
  return Object.prototype.hasOwnProperty.call(event || {}, key)
    || Object.prototype.hasOwnProperty.call(event?.data || {}, key);
}

// Non-transcript diagnostics for a live run. Retains agent-loading, permission,
// and failure signals so a FAIL verdict stays explainable, without keeping any
// assistant message content in durable evidence.
export function liveRunDiagnostics(events) {
  const of = (type) => events.filter((event) => event?.type === type);
  const custom = of("session.custom_agents_updated");
  const messages = of("assistant.message");
  const resultKind = (result) => {
    if (typeof result === "string") return result;
    const named = result?.kind ?? result?.type ?? result?.status;
    return typeof named === "string" ? named : "unknown";
  };
  const permissionRequests = new Map(of("permission.requested")
    .map((event) => [eventField(event, "requestId"), eventField(event, "permissionRequest")])
    .filter(([requestId]) => typeof requestId === "string"));
  const permissionSummary = (requestData) => {
    const mcpSubject = [requestData.serverName, requestData.toolName].filter((value) => typeof value === "string" && value).join("/");
    const subject = requestData.fullCommandText ?? requestData.fileName ?? requestData.path ?? requestData.url ?? mcpSubject ?? requestData.kind ?? "unknown";
    return {
      toolName: typeof requestData.toolName === "string" && requestData.toolName ? requestData.toolName : requestData.kind || "unknown",
      subject: sanitizeLine(subject, 200),
    };
  };
  const permissionResults = [];
  const permissionDenials = [];
  const resolvedRequestIds = new Set();
  for (const event of of("permission.completed")) {
    const requestId = eventField(event, "requestId");
    if (!permissionRequests.has(requestId)) continue;
    const request = permissionRequests.get(requestId);
    const requestData = request && typeof request === "object" ? request : {};
    const result = resultKind(eventField(event, "result"));
    resolvedRequestIds.add(requestId);
    permissionResults.push(result);
    if (!result.startsWith("denied")) continue;
    const toolCallId = eventField(event, "toolCallId") ?? requestData.toolCallId;
    permissionDenials.push({
      ...permissionSummary(requestData),
      toolCallId: typeof toolCallId === "string" && toolCallId ? toolCallId : null,
    });
  }
  const permissionUnresolved = [...permissionRequests.entries()]
    .filter(([requestId]) => !resolvedRequestIds.has(requestId))
    .map(([, request]) => {
      const requestData = request && typeof request === "object" ? request : {};
      return {
        ...permissionSummary(requestData),
        toolCallId: typeof requestData.toolCallId === "string" && requestData.toolCallId ? requestData.toolCallId : null,
      };
    });
  return {
    customAgents: [...new Set(custom.flatMap((event) =>
      (eventField(event, "agents") || []).map((agent) => agent?.name).filter(Boolean)))].sort(),
    customAgentWarnings: custom.flatMap((event) => eventField(event, "warnings") || []),
    customAgentErrors: custom.flatMap((event) => eventField(event, "errors") || []),
    permissionRequests: of("permission.requested").length,
    permissionResults,
    permissionDenials,
    permissionUnresolved,
    modelCallFailures: of("model.call_failure").length,
    assistantMessageCount: messages.length,
    assistantMessageBytes: messages.reduce((total, event) =>
      total + Buffer.byteLength(JSON.stringify(event?.data ?? "")), 0),
  };
}

// A completed one-shot run may never attempt an incomplete root stop, so a
// missing root block is not itself a failure. While the goal is incomplete,
// however, a root block remains required; worker stops must never be blocked.
export function liveHookAcceptance({ hooks, runtimeCompleted } = {}) {
  if (!hooks || !Number.isInteger(hooks.rootBlocks) || !Number.isInteger(hooks.workerBlocks)) return false;
  return hooks.workerBlocks === 0 && (runtimeCompleted === true || hooks.rootBlocks >= 1);
}

// Config for the run-owned Copilot home. It carries no installedPlugins, so the
// user's globally installed copilot-swarm cannot load beside the snapshot under
// test, and it pre-trusts the run roots so no trust prompt can stall a
// --no-ask-user session. The user's own ~/.copilot is never read or written.
export function isolatedCopilotConfig({ qa, writer, runRoot, baseConfig = {} }) {
  const { installedPlugins: _drop, trustedFolders = [], ...rest } = baseConfig;
  return {
    ...rest,
    installedPlugins: [],
    trustedFolders: [...new Set([...trustedFolders, runRoot, qa, writer].filter(Boolean))],
    appTipShown: true,
    appInstallNudgeResponded: true,
  };
}

// Read the host Copilot config read-only. It is JSONC, so line comments are
// stripped before parsing. Any failure yields {} rather than aborting the run;
// the host file is never written.
export function readHostCopilotConfig(env = process.env) {
  const home = env.COPILOT_HOME || join(env.HOME || homedir(), ".copilot");
  try {
    const raw = readFileSync(join(home, "config.json"), "utf8")
      .split("\n").filter((line) => !/^\s*\/\//.test(line)).join("\n");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

// A steering_flagged entry without verb/gate was written by a copilot-swarm build
// older than the polarity repair, i.e. a plugin other than the snapshot under test.
export function foreignPluginLedgerEvidence(ledgerText) {
  return String(ledgerText || "").split("\n").flatMap((line) => {
    if (!line.trim()) return [];
    let entry;
    try { entry = JSON.parse(line); } catch { return []; }
    if (entry?.kind !== "steering_flagged") return [];
    const named = typeof entry.verb === "string" && entry.verb && typeof entry.gate === "string" && entry.gate;
    return named ? [] : [{ at: entry.at ?? null, text: sanitizeLine(entry.text ?? "", 200) }];
  });
}

function isRootEvent(event) {
  return !eventHasField(event, "agentId") && !eventHasField(event, "parentToolCallId");
}

function isWriterEvent(event, writerAgentId) {
  return event?.agentId === writerAgentId
    && event?.data?.parentToolCallId === writerAgentId
    && !Object.prototype.hasOwnProperty.call(event, "parentToolCallId")
    && !Object.prototype.hasOwnProperty.call(event?.data || {}, "agentId");
}

function inspectTodo6Run(contract) {
  const state = getState(contract.qa);
  const exists = existsSync(contract.integratedResultPath);
  return {
    state,
    result: {
      exists,
      bytes: exists ? readFileSync(contract.integratedResultPath) : Buffer.alloc(0),
      diffNames: git(contract.qa, ["diff", "--name-only", contract.baseline, "HEAD"]).trim().split("\n").filter(Boolean),
      qaStatus: git(contract.qa, ["status", "--porcelain=v1", "--untracked-files=all"]),
      writerStatus: git(contract.writer, ["status", "--porcelain=v1", "--untracked-files=all"]),
    },
  };
}

export function evaluateLiveTodo6Events(events, contract) {
  if (!Array.isArray(events)) throw new Error("events must be an array");
  const violations = [];
  const taskEvents = events.filter((event) => event?.type === "tool.execution_start" && eventField(event, "toolName") === "task");
  const taskStarts = taskEvents.length;
  if (taskStarts !== 2) violations.push("worker-launch-count");
  const taskRoles = taskEvents
    .map((event) => eventField(event, "arguments")?.agent_type || eventField(event, "arguments")?.agentName)
    .sort();
  if (JSON.stringify(taskRoles) !== JSON.stringify(["explorer", "general-purpose"])) violations.push("worker-role-mismatch");
  if (taskEvents.some((event) => eventField(event, "arguments")?.mode !== "sync")) violations.push("worker-mode-mismatch");
  if (events.some((event) => event?.type === "tool.execution_complete"
    && (eventField(event, "success") !== true || eventField(event, "error")))) {
    violations.push("tool-execution-failed");
  }
  const completionEvents = events.filter((event) => event?.type === "tool.execution_complete" && eventField(event, "toolCallId"));
  const taskCallIds = taskEvents.map((event) => eventField(event, "toolCallId"));
  if (taskCallIds.some((id) => typeof id !== "string" || !id)
    || new Set(taskCallIds).size !== taskCallIds.length
    || taskEvents.some((event) => completionEvents.filter((completion) =>
      eventField(completion, "toolCallId") === eventField(event, "toolCallId")).length !== 1)) {
    violations.push("worker-tool-call-id-invalid");
  }
  const completions = new Map(completionEvents.map((event) => [eventField(event, "toolCallId"), event]));
  const taskCompletions = taskEvents.map((event) => completions.get(eventField(event, "toolCallId")));
  if ([...taskEvents, ...taskCompletions].some((event) => event && !isRootEvent(event))) {
    violations.push("worker-root-provenance-invalid");
  }
  const writerTask = taskEvents.find((event) => {
    const args = eventField(event, "arguments");
    return (args?.agent_type || args?.agentName) === "general-purpose";
  });
  const writerTaskCompletion = completions.get(eventField(writerTask, "toolCallId"));
  const writerAgentId = eventField(writerTask, "toolCallId");
  if (!writerAgentId) violations.push("writer-agent-unbound");
  const bashStarts = events.filter((event) => event?.type === "tool.execution_start"
    && eventField(event, "toolName") === "bash");
  const writerCommands = bashStarts.filter((event) => isWriterEvent(event, writerAgentId));
  const writerCommandTexts = writerCommands.map((event) => eventField(event, "arguments")?.command);
  if (JSON.stringify(writerCommandTexts) !== JSON.stringify([
    contract.writerShellCommand,
    contract.writerCommitShellCommand,
  ])) violations.push("writer-provenance-missing");
  const otherWorkerWrites = bashStarts.some((event) =>
    eventField(event, "agentId") && eventField(event, "agentId") !== writerAgentId);
  if (otherWorkerWrites) violations.push("worker-boundary-violation");

  const rootCommands = bashStarts.filter(isRootEvent);
  if (bashStarts.some((event) => !writerCommands.includes(event) && !rootCommands.includes(event))) {
    violations.push("bash-provenance-invalid");
  }
  const allowedRootCommands = new Set(contract.requiredRootShellCommands);
  if (rootCommands.some((event) => !allowedRootCommands.has(eventField(event, "arguments")?.command))) {
    violations.push("root-shell-command-unapproved");
  }
  for (const command of contract.requiredRootShellCommands) {
    if (rootCommands.filter((event) => eventField(event, "arguments")?.command === command).length !== 1) {
      violations.push("root-command-sequence-incomplete");
      break;
    }
  }
  if (rootCommands.map((event) => eventField(event, "arguments")?.command).join("\n")
    !== contract.requiredRootShellCommands.join("\n")) violations.push("root-command-order");

  const eventIndex = (event) => events.indexOf(event);
  const showEvent = rootCommands.find((event) => eventField(event, "arguments")?.command === contract.requiredRootShellCommands[0]);
  const showCompletion = completions.get(eventField(showEvent, "toolCallId"));
  const verifierEvent = rootCommands.find((event) => eventField(event, "arguments")?.command === contract.resultVerifierShellCommand);
  const writerTaskIndex = eventIndex(writerTask);
  const writerTaskCompletionIndex = eventIndex(writerTaskCompletion);
  const writerCommandIndexes = writerCommands.map(eventIndex);
  const writerCommandCompletions = writerCommands.map((event) => completions.get(eventField(event, "toolCallId")));
  const rootCommandCompletions = rootCommands.map((event) => completions.get(eventField(event, "toolCallId")));
  const taskCompletionIndexes = taskCompletions.map(eventIndex);
  const writerTimeline = writerCommands.length === 2 && writerCommandCompletions.every(Boolean)
    && writerTaskIndex < writerCommandIndexes[0]
    && writerCommandIndexes[0] < eventIndex(writerCommandCompletions[0])
    && eventIndex(writerCommandCompletions[0]) < writerCommandIndexes[1]
    && writerCommandIndexes[1] < eventIndex(writerCommandCompletions[1])
    && eventIndex(writerCommandCompletions[1]) < writerTaskCompletionIndex;
  const rootTimeline = rootCommands.length === contract.requiredRootShellCommands.length
    && rootCommandCompletions.every(Boolean)
    && rootCommands.every((event, index) => eventIndex(event) < eventIndex(rootCommandCompletions[index]))
    && rootCommands.slice(1).every((event, index) => eventIndex(rootCommandCompletions[index]) < eventIndex(event));
  if (!showEvent || !showCompletion || eventIndex(showEvent) >= eventIndex(showCompletion)
    || taskEvents.some((event) => eventIndex(event) <= eventIndex(showCompletion))
    || taskEvents.some((event, index) => eventIndex(event) >= taskCompletionIndexes[index])
    || writerTaskIndex < 0
    || !writerTimeline
    || !verifierEvent
    || taskCompletionIndexes.some((index) => eventIndex(verifierEvent) <= index)
    || !rootTimeline) violations.push("workflow-order");

  const requiredStarts = [...taskEvents, ...writerCommands, ...rootCommands];
  const requiredIds = requiredStarts.map((event) => eventField(event, "toolCallId"));
  if (requiredIds.some((id) => typeof id !== "string" || !id)
    || new Set(requiredIds).size !== requiredIds.length
    || requiredStarts.some((event) => {
    const id = eventField(event, "toolCallId");
    const matches = completionEvents.filter((completion) => eventField(completion, "toolCallId") === id);
    const completion = matches[0];
    const toolName = eventField(event, "toolName");
    const originMatches = toolName === "task"
      ? isRootEvent(completion)
      : isWriterEvent(event, writerAgentId)
        ? isWriterEvent(completion, writerAgentId)
        : isRootEvent(event) && isRootEvent(completion);
    return matches.length !== 1
      || eventField(completion, "success") !== true
      || eventField(completion, "error")
      || !originMatches;
  })) violations.push("tool-pair-incomplete");

  const terminalResults = events.filter((event) => event?.type === "result");
  if (terminalResults.length !== 1) violations.push("capture-incomplete");
  const terminalExitCode = (event) => event?.data?.processExitCode
    ?? event?.data?.exitCode
    ?? event?.processExitCode
    ?? event?.exitCode;
  const terminalError = (event) => event?.data?.error ?? event?.error;
  if (terminalResults.some((event) => terminalExitCode(event) !== 0 || terminalError(event))) {
    violations.push("terminal-result-failed");
  }
  const terminalIndex = eventIndex(terminalResults[0]);
  const lastRootCompletionIndex = eventIndex(rootCommandCompletions.at(-1));
  if (terminalIndex <= lastRootCompletionIndex
    || events.slice(terminalIndex + 1).some((event) => [
      "model.call_start",
      "assistant.turn_start",
      "tool.execution_start",
    ].includes(event?.type))) violations.push("post-completion-activity");
  const structuredErrors = events.map((event) => eventField(event, "error")).filter(Boolean);
  if (structuredErrors.some((error) => /denied|permission/i.test(`${error?.code || ""} ${error?.message || ""}`))) {
    violations.push("permission-denied");
  }
  if (structuredErrors.some((error) => /quota|credit|402/i.test(`${error?.code || ""} ${error?.message || ""}`))) {
    violations.push("quota-exceeded");
  }
  if (structuredErrors.some((error) => /renderer|render.*crash/i.test(`${error?.code || ""} ${error?.message || ""}`))) {
    violations.push("renderer-crash");
  }

  try {
    const { state, result } = inspectTodo6Run(contract);
    if (state?.completed !== true) violations.push("runtime-incomplete");
    const criteria = Array.isArray(state?.criteria) ? state.criteria : [];
    const ids = criteria.map((criterion) => criterion?.id);
    if (criteria.length !== 3 || new Set(ids).size !== 3
      || !["C001", "C002", "C003"].every((id) => ids.includes(id))) violations.push("criteria-shape");
    for (const criterion of criteria) {
      if (criterion?.status !== "pass" || !Number.isInteger(criterion?.revision) || criterion.revision < 1) {
        violations.push(`criterion-not-pass:${criterion?.id || "unknown"}`);
      }
      if (!validateReceipt(criterion?.receipt).valid || criterion.receipt?.criterionRevision + 1 !== criterion.revision) {
        violations.push(`criterion-receipt-invalid:${criterion?.id || "unknown"}`);
      }
    }
    if (!Array.isArray(state?.reviewBlockers) || state.reviewBlockers.some((blocker) => !blocker.resolved)) {
      violations.push("runtime-blockers-open");
    }
    if (result?.exists !== true) violations.push("result-missing");
    const resultBytes = result.bytes;
    if (resultBytes.length !== Buffer.byteLength("CSW_OK")) violations.push("result-bytes-mismatch");
    if (createHash("sha256").update(resultBytes).digest("hex") !== createHash("sha256").update("CSW_OK").digest("hex")) {
      violations.push("result-hash-mismatch");
    }
    if (JSON.stringify(result?.diffNames) !== JSON.stringify(["result.txt"])) violations.push("result-diff-mismatch");
    if (result?.qaStatus !== "") violations.push("qa-dirty");
    if (result?.writerStatus !== "") violations.push("writer-dirty");
  } catch {
    violations.push("live-state-unreadable");
  }
  const unique = [...new Set(violations)];
  return { ok: unique.length === 0, violations: unique, taskStarts };
}

export function liveEventTraceSha256(events) {
  if (!Array.isArray(events)) throw new Error("events must be an array");
  return createHash("sha256").update(`${events.map((event) => JSON.stringify(event)).join("\n")}\n`).digest("hex");
}

function flag(argv, name) {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
}

function main(argv) {
  const command = argv[0];
  if (command === "prepare") {
    const contract = prepareTodo6Run({ repo: flag(argv, "--repo"), baseDir: flag(argv, "--base-dir") || tmpdir() });
    const manifestPath = join(contract.capture, "manifest.json");
    writeFileSync(manifestPath, `${JSON.stringify(contract, null, 2)}\n`);
    process.stdout.write(`${JSON.stringify({ ok: true, executed: false, manifestPath })}\n`);
    return 0;
  }
  if (command === "cleanup") {
    const manifestPath = canonical(flag(argv, "--manifest"), "manifest");
    const contract = JSON.parse(readFileSync(manifestPath, "utf8"));
    process.stdout.write(`${JSON.stringify({ ok: cleanupTodo6Run(contract) })}\n`);
    return 0;
  }
  process.stderr.write("Usage: node qa/todo6-live-harness.mjs prepare --repo <path> [--base-dir <path>] | cleanup --manifest <path>\n");
  return 2;
}

function isMainModule() {
  if (!process.argv[1]) return false;
  try { return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]); }
  catch { return fileURLToPath(import.meta.url) === process.argv[1]; }
}

if (isMainModule()) process.exit(main(process.argv.slice(2)));
