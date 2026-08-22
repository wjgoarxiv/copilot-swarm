import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative } from "node:path";
import {
  buildLiveTodo6Contract,
  cleanupTodo6Run,
  evaluateLiveTodo6Events,
  liveHookAcceptance,
  liveRunDiagnostics,
  foreignPluginLedgerEvidence,
  isolatedCopilotConfig,
  liveEventTraceSha256,
  prepareTodo6Run,
} from "../qa/todo6-live-harness.mjs";

function withFixture(run) {
  const root = mkdtempSync(join(tmpdir(), "csw-live-contract-"));
  const qa = join(root, "qa");
  const writer = join(root, "writer");
  const capture = join(root, "capture");
  const repo = join(root, "repo");
  const plugin = join(qa, ".csw", "plugin-snapshot", "package");
  for (const path of [qa, writer, capture, repo, plugin]) mkdirSync(path, { recursive: true });
  try { return run({ qa, writer, capture, repo, plugin }); }
  finally { rmSync(root, { recursive: true, force: true }); }
}

test("live Todo 6 contract canonicalizes roots and keeps capture outside both git worktrees", () => {
  withFixture((paths) => {
    const contract = buildLiveTodo6Contract({ ...paths, baseline: "a".repeat(40) });
    assert.equal(contract.qa, realpathSync(paths.qa));
    assert.equal(contract.writer, realpathSync(paths.writer));
    assert.equal(contract.repo, realpathSync(paths.repo));
    assert.equal(contract.plugin, realpathSync(paths.plugin));
    assert.equal(contract.capture, realpathSync(paths.capture));
    assert.ok(contract.plugin.startsWith(`${contract.qa}/`));
    assert.equal(contract.copilotArgs[contract.copilotArgs.indexOf("--plugin-dir") + 1], contract.plugin);
    assert.notEqual(contract.plugin, contract.repo);
    for (const root of [contract.qa, contract.writer]) {
      const rel = relative(root, contract.capture);
      assert.ok(rel === ".." || rel.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`));
    }
    assert.ok(isAbsolute(contract.logDir));
    assert.ok(contract.logDir.startsWith(`${contract.capture}/`));
  });
});

test("live Todo 6 contract rejects a plugin outside the QA root", () => {
  withFixture((paths) => {
    assert.throws(
      () => buildLiveTodo6Contract({ ...paths, plugin: paths.repo, baseline: "0".repeat(40) }),
      /plugin snapshot must be inside the QA root/,
    );
  });
});

test("live Todo 6 contract emits an exact argv and a shell-safe writer command", () => {
  withFixture((paths) => {
    const contract = buildLiveTodo6Contract({ ...paths, baseline: "b".repeat(40) });
    assert.deepEqual(contract.writerArgv, [
      realpathSync(process.execPath),
      "-e",
      'require("node:fs").writeFileSync(process.argv[1],"CSW_OK")',
      join(realpathSync(paths.writer), "result.txt"),
    ]);
    assert.match(contract.writerShellCommand, /^node -e '/);
    assert.match(contract.writerShellCommand, /writeFileSync/);
    assert.doesNotMatch(contract.writerShellCommand, /printf|>|copyFile/);
  });
});

test("live Todo 6 prompt gates task dispatch behind the preinitialized goal and forbids root takeover", () => {
  withFixture((paths) => {
    const contract = buildLiveTodo6Contract({ ...paths, baseline: "c".repeat(40) });
    const show = contract.prompt.indexOf("show");
    const goal = contract.prompt.indexOf("preinitialized goal");
    const task = contract.prompt.indexOf("task");
    assert.ok(show >= 0 && goal > show && task > goal);
    assert.match(contract.prompt, /writer fails or cannot mutate[\s\S]*root must not perform/i);
    assert.match(contract.prompt, /blocker[\s\S]*stop/i);
    assert.match(contract.prompt, /exactly two workers|exactly two[^\n]*workers/i);
    assert.match(contract.prompt, /task tool in mode sync/i);
    assert.match(contract.prompt, /capture directory is outside both git worktrees/i);
  });
});

test("live Todo 6 prompt binds both writer mutations to the worker and forbids root repair", () => {
  withFixture((paths) => {
    const contract = buildLiveTodo6Contract({ ...paths, baseline: "c".repeat(40) });
    assert.match(contract.prompt, /writer task must complete both ordered commands before returning/i);
    assert.match(contract.prompt, /root must never execute either writer command/i);
    assert.match(contract.prompt, /if the writer task returns without the commit, stop and record a blocker/i);
  });
});

test("live Todo 6 prompt keeps concurrent explorer observations advisory", () => {
  withFixture((paths) => {
    const contract = buildLiveTodo6Contract({ ...paths, baseline: "c".repeat(40) });
    assert.match(contract.prompt, /explorer observations are advisory and may reflect pre-writer state/i);
    assert.match(contract.prompt, /do not treat explorer findings about refs or result\.txt as a blocker/i);
    assert.match(contract.prompt, /after both tasks complete, follow root commands 2-7 exactly/i);
  });
});

test("live Todo 6 prompt serializes every root command across assistant turns", () => {
  withFixture((paths) => {
    const contract = buildLiveTodo6Contract({ ...paths, baseline: "c".repeat(40) });
    assert.match(contract.prompt, /at most one root bash tool call per assistant turn/i);
    assert.match(contract.prompt, /never emit multiple root bash calls together or pre-issue the next command/i);
    assert.match(contract.prompt, /commands 4, 5, and 6 must be strictly serialized/i);
  });
});

test("prepare-only harness preinitializes C001-C003 without launching Copilot and cleans owned state", () => {
  const contract = prepareTodo6Run({ repo: join(import.meta.dirname, "..") });
  try {
    assert.equal(contract.capture.startsWith(`${contract.runRoot}/`), true);
    assert.equal(contract.logDir.startsWith(`${contract.capture}/`), true);
    assert.equal(contract.plugin.startsWith(`${contract.qa}/`), true);
    assert.equal(existsSync(join(contract.plugin, "bin", "csw-runtime.mjs")), true);
    assert.equal(existsSync(join(contract.plugin, ".plugin", "plugin.json")), true);
    assert.equal(existsSync(join(contract.plugin, "qa")), false);
    assert.equal(existsSync(join(contract.plugin, "test")), false);
    assert.equal(contract.pluginHashes.length, 8);
    assert.ok(contract.pluginHashes.every((entry) => entry.sourceSha256 === entry.snapshotSha256));
    assert.equal(readdirSync(join(contract.qa, ".csw", "plugin-snapshot")).some((entry) => entry.endsWith(".tgz")), false);
    assert.match(readFileSync(join(contract.qa, ".gitignore"), "utf8"), /^\.csw\/$/m);
    assert.equal(existsSync(join(contract.qa, ".csw", "state.json")), true);
    const doctrine = JSON.parse(execFileSync(process.execPath, [join(contract.plugin, "hooks", "session-doctrine.mjs")], {
      cwd: contract.qa,
      input: "{}",
      encoding: "utf8",
    }));
    assert.match(doctrine.additionalContext, new RegExp(join(contract.plugin, "bin", "csw-runtime.mjs").replaceAll("/", "\\/")));
    const injectedRuntime = contract.requiredRootShellCommands[0].replace(/ 'show'$/, "");
    assert.ok(doctrine.additionalContext.includes(`${injectedRuntime} <subcommand>`));
    assert.ok(contract.prompt.includes(contract.requiredRootShellCommands[0]));
    const shown = JSON.parse(execFileSync(process.execPath, [join(contract.plugin, "bin", "csw-runtime.mjs"), "show"], {
      cwd: contract.qa,
      encoding: "utf8",
    }));
    assert.equal(shown.goalId, contract.pluginRuntimeGoalId);
    assert.deepEqual(shown.criteria.map(({ id, status }) => ({ id, status })), [
      { id: "C001", status: "pending" },
      { id: "C002", status: "pending" },
      { id: "C003", status: "pending" },
    ]);
    assert.equal(execFileSync("git", ["status", "--porcelain=v1", "--untracked-files=all"], {
      cwd: contract.qa,
      encoding: "utf8",
    }), "");
  } finally {
    assert.equal(cleanupTodo6Run(contract), true);
    assert.equal(existsSync(contract.runRoot), false);
  }
});

test("prepare-only harness rejects ambient CSW_HOME before creating owned state", () => {
  assert.throws(
    () => prepareTodo6Run({ repo: join(import.meta.dirname, ".."), env: { CSW_HOME: "/outside" } }),
    /CSW_HOME must be unset/,
  );
});

function validReceipt() {
  const hash = "a".repeat(64);
  return {
    type: "verify",
    receiptVersion: 1,
    argv0Sha256: hash,
    argumentCount: 0,
    argvSha256: hash,
    criterionRevision: 1,
    exitCode: 0,
    signal: null,
    timedOut: false,
    errorCode: null,
    durationMs: 1,
    timeoutMs: 1000,
    output: {
      limitBytes: 1024,
      limitExceeded: false,
      truncated: false,
      stdout: { bytes: 0, sha256: hash },
      stderr: { bytes: 0, sha256: hash },
    },
    workspace: { version: 1, available: false, reason: "not-git" },
    at: "2026-08-17T00:00:00.000Z",
  };
}

function passingObservation(events) {
  const observation = {
    summary: {
      eventCount: events.length,
      traceSha256: liveEventTraceSha256(events),
      tools: { deniedCount: 0, deniedCodes: [] },
      workers: { taskStarts: 2 },
      markers: { permissionDenied: false, quotaExceeded: false, rendererCrash: false },
    },
    state: {
      completed: true,
      criteria: ["C001", "C002", "C003"].map((id) => ({ id, status: "pass", revision: 1, receipt: validReceipt() })),
      reviewBlockers: [],
    },
    result: {
      exists: true,
      bytes: Buffer.from("CSW_OK"),
      diffNames: ["result.txt"],
      qaStatus: "",
      writerStatus: "",
    },
  };
  return observation;
}

function toolPair({ toolName, toolCallId, command, agentId, agent_type }) {
  const start = { type: "tool.execution_start", data: { toolName, toolCallId } };
  if (command) start.data.arguments = { command };
  if (agent_type) start.data.arguments = { agent_type, mode: "sync" };
  if (agentId) {
    start.agentId = agentId;
    start.data.parentToolCallId = agentId;
  }
  const complete = { type: "tool.execution_complete", data: { toolCallId, success: true } };
  if (agentId) {
    complete.agentId = agentId;
    complete.data.parentToolCallId = agentId;
  }
  return [start, complete];
}

function callId(event) {
  return event?.toolCallId ?? event?.data?.toolCallId;
}

function passingEvents(contract) {
  const rootPairs = contract.requiredRootShellCommands.map((command, index) => toolPair({
    toolName: "bash",
    toolCallId: `root-${index}`,
    command,
  }));
  const explorerStart = { type: "tool.execution_start", data: { toolName: "task", toolCallId: "task-explorer", arguments: { agent_type: "explorer", mode: "sync" } } };
  const explorerComplete = { type: "tool.execution_complete", data: { toolCallId: "task-explorer", success: true } };
  const writerStart = { type: "tool.execution_start", data: { toolName: "task", toolCallId: "task-writer", arguments: { agent_type: "general-purpose", mode: "sync" } } };
  const writerComplete = { type: "tool.execution_complete", data: { toolCallId: "task-writer", success: true } };
  return [
    ...rootPairs[0],
    explorerStart,
    writerStart,
    ...toolPair({ toolName: "bash", toolCallId: "writer-command", command: contract.writerShellCommand, agentId: "task-writer" }),
    ...toolPair({ toolName: "bash", toolCallId: "writer-commit", command: contract.writerCommitShellCommand, agentId: "task-writer" }),
    explorerComplete,
    writerComplete,
    ...rootPairs.slice(1).flat(),
    { type: "result", data: { processExitCode: 0 } },
  ];
}

function realizePassingState(contract) {
  execFileSync(contract.writerArgv[0], contract.writerArgv.slice(1), { cwd: contract.writer });
  execFileSync("git", ["add", "--", "result.txt"], { cwd: contract.writer });
  execFileSync("git", ["commit", "-m", "Todo 6 writer result"], { cwd: contract.writer });
  execFileSync(contract.resultVerifierArgv[0], contract.resultVerifierArgv.slice(1), { cwd: contract.qa });
  execFileSync(contract.integrateArgv[0], contract.integrateArgv.slice(1), { cwd: contract.qa });
  for (const argv of contract.criterionVerifyArgvs) execFileSync(argv[0], argv.slice(1), { cwd: contract.qa });
  execFileSync(contract.runtimeCompleteArgv[0], contract.runtimeCompleteArgv.slice(1), { cwd: contract.qa });
}

function withPreparedRun(run, { pass = false } = {}) {
  const contract = prepareTodo6Run({ repo: join(import.meta.dirname, "..") });
  try {
    if (pass) realizePassingState(contract);
    return run(contract);
  } finally {
    if (existsSync(contract.runRoot)) cleanupTodo6Run(contract);
  }
}

test("live Todo 6 evaluator requires exactly two workers and rejects structured permission failure", () => {
  withPreparedRun((contract) => {
    const events = [
      { type: "tool.execution_start", data: { toolName: "bash", toolCallId: "denied-show", arguments: { command: "node runtime show" } } },
      { type: "tool.execution_complete", data: { toolCallId: "denied-show", success: false, error: { code: "denied" } } },
    ];
    const verdict = evaluateLiveTodo6Events(events, contract);
    assert.equal(verdict.ok, false);
    for (const violation of [
      "worker-launch-count",
      "tool-execution-failed",
      "permission-denied",
      "runtime-incomplete",
      "criterion-not-pass:C001",
      "result-missing",
      "writer-provenance-missing",
    ]) assert.ok(verdict.violations.includes(violation), violation);
  });
});

test("live Todo 6 evaluator accepts only a structurally complete trace bound to live state", () => {
  withPreparedRun((contract) => {
    const events = passingEvents(contract);
    assert.deepEqual(evaluateLiveTodo6Events(events, contract), {
      ok: true,
      violations: [],
      taskStarts: 2,
    });
  }, { pass: true });
});

test("live Todo 6 evaluator accepts Copilot's top-level terminal exitCode", () => {
  withPreparedRun((contract) => {
    const events = passingEvents(contract);
    const terminal = events.find((event) => event.type === "result");
    delete terminal.data;
    terminal.exitCode = 0;
    assert.deepEqual(evaluateLiveTodo6Events(events, contract), {
      ok: true,
      violations: [],
      taskStarts: 2,
    });
  }, { pass: true });
});

test("live Todo 6 evaluator rejects alternate root write APIs even when every other signal is green", () => {
  withPreparedRun((contract) => {
    const events = passingEvents(contract);
    events.splice(-2, 0, {
      type: "tool.execution_start",
      toolName: "bash",
      toolCallId: "root-write-bypass",
      arguments: { command: 'node -e \'require("node:fs").writeFileSync(process.argv[1],"CSW_OK")\' "$(dirname "$PWD")/wri*/result.txt"' },
    }, {
      type: "tool.execution_complete",
      toolName: "bash",
      toolCallId: "root-write-bypass",
      success: true,
    });
    const verdict = evaluateLiveTodo6Events(events, contract);
    assert.equal(verdict.ok, false);
    assert.ok(verdict.violations.includes("root-shell-command-unapproved"));
  }, { pass: true });
});

test("live Todo 6 evaluator requires one explorer and one general-purpose worker", () => {
  withPreparedRun((contract) => {
    const events = passingEvents(contract);
    const explorer = events.find((event) => event.type === "tool.execution_start" && callId(event) === "task-explorer");
    explorer.data.arguments.agent_type = "general-purpose";
    const verdict = evaluateLiveTodo6Events(events, contract);
    assert.equal(verdict.ok, false);
    assert.ok(verdict.violations.includes("worker-role-mismatch"));
  }, { pass: true });
});

test("live Todo 6 evaluator ignores fabricated observations and reads the actual runtime and git state", () => {
  withFixture((paths) => {
    const contract = buildLiveTodo6Contract({ ...paths, baseline: "3".repeat(40) });
    const events = passingEvents(contract);
    const observation = passingObservation(events);
    const verdict = evaluateLiveTodo6Events(events, contract, observation);
    assert.equal(verdict.ok, false);
    assert.ok(verdict.violations.includes("live-state-unreadable"));
  });
});

test("live Todo 6 evaluator binds writer mutation to the general-purpose task result", () => {
  withPreparedRun((contract) => {
    const events = passingEvents(contract);
    for (const event of events) {
      if (callId(event) === "writer-command" || callId(event) === "writer-commit") event.agentId = "call_explorer";
    }
    const verdict = evaluateLiveTodo6Events(events, contract);
    assert.equal(verdict.ok, false);
    assert.ok(verdict.violations.includes("writer-provenance-missing"));
    assert.ok(verdict.violations.includes("worker-boundary-violation"));
  }, { pass: true });
});

test("live Todo 6 evaluator rejects reordered writer work, early dispatch, and duplicate task call ids", () => {
  withPreparedRun((contract) => {
    const reversedWriter = passingEvents(contract);
    const writeStart = reversedWriter.find((event) => event.type === "tool.execution_start" && callId(event) === "writer-command");
    const commitStart = reversedWriter.find((event) => event.type === "tool.execution_start" && callId(event) === "writer-commit");
    [writeStart.data.arguments.command, commitStart.data.arguments.command] = [commitStart.data.arguments.command, writeStart.data.arguments.command];
    assert.ok(evaluateLiveTodo6Events(reversedWriter, contract).violations.includes("writer-provenance-missing"));

    const earlyDispatch = passingEvents(contract);
    const showCompletionIndex = earlyDispatch.findIndex((event) => event.type === "tool.execution_complete" && callId(event) === "root-0");
    const [showCompletion] = earlyDispatch.splice(showCompletionIndex, 1);
    const firstTaskIndex = earlyDispatch.findIndex((event) => event.type === "tool.execution_start" && event.data?.toolName === "task");
    earlyDispatch.splice(firstTaskIndex + 1, 0, showCompletion);
    assert.ok(evaluateLiveTodo6Events(earlyDispatch, contract).violations.includes("workflow-order"));

    const duplicateTaskId = passingEvents(contract);
    const writerStart = duplicateTaskId.find((event) => event.type === "tool.execution_start" && callId(event) === "task-writer");
    writerStart.data.toolCallId = "task-explorer";
    const writerCompletionIndex = duplicateTaskId.findIndex((event) => event.type === "tool.execution_complete" && callId(event) === "task-writer");
    duplicateTaskId.splice(writerCompletionIndex, 1);
    assert.ok(evaluateLiveTodo6Events(duplicateTaskId, contract).violations.includes("worker-tool-call-id-invalid"));

    const delayedWriteCompletion = passingEvents(contract);
    const writeCompletionIndex = delayedWriteCompletion.findIndex((event) => event.type === "tool.execution_complete" && callId(event) === "writer-command");
    const [writeCompletion] = delayedWriteCompletion.splice(writeCompletionIndex, 1);
    const commitStartIndex = delayedWriteCompletion.findIndex((event) => event.type === "tool.execution_start" && callId(event) === "writer-commit");
    delayedWriteCompletion.splice(commitStartIndex + 1, 0, writeCompletion);
    assert.ok(evaluateLiveTodo6Events(delayedWriteCompletion, contract).violations.includes("workflow-order"));

    const lateExplorer = passingEvents(contract);
    const explorerCompletionIndex = lateExplorer.findIndex((event) => event.type === "tool.execution_complete" && callId(event) === "task-explorer");
    const [explorerCompletion] = lateExplorer.splice(explorerCompletionIndex, 1);
    lateExplorer.splice(-1, 0, explorerCompletion);
    assert.ok(evaluateLiveTodo6Events(lateExplorer, contract).violations.includes("workflow-order"));

    const overlappingRoot = passingEvents(contract);
    const rootCompletionIndex = overlappingRoot.findIndex((event) => event.type === "tool.execution_complete" && callId(event) === "root-2");
    const [rootCompletion] = overlappingRoot.splice(rootCompletionIndex, 1);
    const nextRootStartIndex = overlappingRoot.findIndex((event) => event.type === "tool.execution_start" && callId(event) === "root-3");
    overlappingRoot.splice(nextRootStartIndex + 1, 0, rootCompletion);
    assert.ok(evaluateLiveTodo6Events(overlappingRoot, contract).violations.includes("workflow-order"));

    const earlyResult = passingEvents(contract);
    const resultIndex = earlyResult.findIndex((event) => event.type === "result");
    const [result] = earlyResult.splice(resultIndex, 1);
    earlyResult.splice(2, 0, result);
    earlyResult.push({ type: "model.call_start" });
    assert.ok(evaluateLiveTodo6Events(earlyResult, contract).violations.includes("post-completion-activity"));

    const wrongParent = passingEvents(contract);
    for (const event of wrongParent) {
      if (callId(event) === "writer-command" || callId(event) === "writer-commit") {
        event.data.parentToolCallId = "task-explorer";
      }
    }
    assert.ok(evaluateLiveTodo6Events(wrongParent, contract).violations.includes("writer-provenance-missing"));

    const contradictoryCompletionAgent = passingEvents(contract);
    for (const event of contradictoryCompletionAgent) {
      if (event.type === "tool.execution_complete"
        && (callId(event) === "writer-command" || callId(event) === "writer-commit")) event.agentId = "call_explorer";
    }
    assert.ok(evaluateLiveTodo6Events(contradictoryCompletionAgent, contract).violations.includes("tool-pair-incomplete"));

    const childOriginTaskCompletion = passingEvents(contract);
    childOriginTaskCompletion.find((event) =>
      event.type === "tool.execution_complete" && callId(event) === "task-writer").agentId = "contradictory-child";
    assert.ok(evaluateLiveTodo6Events(childOriginTaskCompletion, contract).violations.includes("worker-root-provenance-invalid"));

    const parentedTaskCompletion = passingEvents(contract);
    parentedTaskCompletion.find((event) =>
      event.type === "tool.execution_complete" && callId(event) === "task-writer").data.parentToolCallId = "contradictory-parent";
    assert.ok(evaluateLiveTodo6Events(parentedTaskCompletion, contract).violations.includes("worker-root-provenance-invalid"));

    const nestedTaskStart = passingEvents(contract);
    const nestedExplorerStart = nestedTaskStart.find((event) =>
      event.type === "tool.execution_start" && callId(event) === "task-explorer");
    nestedExplorerStart.agentId = "nested-parent";
    nestedExplorerStart.data.parentToolCallId = "nested-parent";
    assert.ok(evaluateLiveTodo6Events(nestedTaskStart, contract).violations.includes("worker-root-provenance-invalid"));

    const nullTaskOrigin = passingEvents(contract);
    nullTaskOrigin.find((event) =>
      event.type === "tool.execution_start" && callId(event) === "task-explorer").agentId = null;
    nullTaskOrigin.find((event) =>
      event.type === "tool.execution_complete" && callId(event) === "task-writer").data.parentToolCallId = null;
    assert.ok(evaluateLiveTodo6Events(nullTaskOrigin, contract).violations.includes("worker-root-provenance-invalid"));

    const unclassifiedWriterBash = passingEvents(contract);
    const terminalIndex = unclassifiedWriterBash.findIndex((event) => event.type === "result");
    unclassifiedWriterBash.splice(terminalIndex, 0,
      {
        type: "tool.execution_start",
        agentId: "task-writer",
        data: {
          toolName: "bash",
          toolCallId: "unclassified-writer-bash",
          parentToolCallId: "wrong-parent",
          arguments: { command: "touch unexpected" },
        },
      },
      {
        type: "tool.execution_complete",
        agentId: "task-writer",
        data: {
          toolCallId: "unclassified-writer-bash",
          parentToolCallId: "wrong-parent",
          success: true,
        },
      });
    assert.ok(evaluateLiveTodo6Events(unclassifiedWriterBash, contract).violations.includes("bash-provenance-invalid"));

    const nestedCompletionAgent = passingEvents(contract);
    const nestedAgentCompletion = nestedCompletionAgent.find((event) =>
      event.type === "tool.execution_complete" && callId(event) === "writer-command");
    delete nestedAgentCompletion.agentId;
    nestedAgentCompletion.data.agentId = "task-writer";
    assert.ok(evaluateLiveTodo6Events(nestedCompletionAgent, contract).violations.includes("tool-pair-incomplete"));

    const liftedCompletionParent = passingEvents(contract);
    const liftedParentCompletion = liftedCompletionParent.find((event) =>
      event.type === "tool.execution_complete" && callId(event) === "writer-command");
    delete liftedParentCompletion.data.parentToolCallId;
    liftedParentCompletion.parentToolCallId = "task-writer";
    assert.ok(evaluateLiveTodo6Events(liftedCompletionParent, contract).violations.includes("tool-pair-incomplete"));

    const nullRootCompletionOrigin = passingEvents(contract);
    nullRootCompletionOrigin.find((event) =>
      event.type === "tool.execution_complete" && callId(event) === "root-1").agentId = null;
    assert.ok(evaluateLiveTodo6Events(nullRootCompletionOrigin, contract).violations.includes("tool-pair-incomplete"));

    const failedTerminal = passingEvents(contract);
    failedTerminal.find((event) => event.type === "result").data.processExitCode = 1;
    assert.ok(evaluateLiveTodo6Events(failedTerminal, contract).violations.includes("terminal-result-failed"));
  }, { pass: true });
});

test("cleanup remains idempotent when the writer worktree was already removed", () => {
  const contract = prepareTodo6Run({ repo: join(import.meta.dirname, "..") });
  let cleaned = false;
  try {
    execFileSync("git", ["worktree", "remove", "--force", contract.writer], { cwd: contract.qa });
    assert.equal(existsSync(contract.writer), false);
    assert.equal(cleanupTodo6Run(contract), true);
    cleaned = true;
    assert.equal(existsSync(contract.runRoot), false);
  } finally {
    if (!cleaned && existsSync(contract.runRoot)) cleanupTodo6Run(contract);
  }
});

test("cleanup remains idempotent when the owned plugin snapshot was already removed", () => {
  const contract = prepareTodo6Run({ repo: join(import.meta.dirname, "..") });
  let cleaned = false;
  try {
    rmSync(contract.plugin, { recursive: true, force: true });
    assert.equal(existsSync(contract.plugin), false);
    assert.equal(cleanupTodo6Run(contract), true);
    cleaned = true;
    assert.equal(existsSync(contract.runRoot), false);
  } finally {
    if (!cleaned && existsSync(contract.runRoot)) cleanupTodo6Run(contract);
  }
});

test("live Todo 6 evaluator rejects a root write without relying on assistant failure prose", () => {
  withFixture((paths) => {
    const contract = buildLiveTodo6Contract({ ...paths, baseline: "d".repeat(40) });
    const events = [
      {
        type: "tool.execution_start",
        data: {
          toolName: "bash",
          arguments: { command: contract.writerShellCommand },
        },
      },
    ];
    const verdict = evaluateLiveTodo6Events(events, contract);
    assert.equal(verdict.ok, false);
    assert.ok(verdict.violations.includes("root-shell-command-unapproved"));
  });
});

test("live Todo 6 prompt names the exact agent types and mode the evaluator requires", () => {
  withFixture((paths) => {
    const contract = buildLiveTodo6Contract({ ...paths, baseline: "c".repeat(40) });
    const prompt = contract.copilotArgs[contract.copilotArgs.indexOf("-p") + 1];
    assert.match(prompt, /agent_type/);
    assert.match(prompt, /"explorer"/);
    assert.match(prompt, /"general-purpose"/);
  });
});

test("live Todo 6 diagnostics expose agent, permission, and failure signals without transcript content", () => {
  const events = [
    { type: "session.custom_agents_updated", data: { agents: [{ name: "explorer", tools: ["read", "search"] }], warnings: ["w1"], errors: [] } },
    { type: "permission.requested", data: { requestId: "r1" } },
    { type: "permission.completed", data: { requestId: "r1", result: { kind: "denied-no-approval-rule" } } },
    { type: "assistant.message", data: { text: "PRIVATETRANSCRIPTMARKER" } },
    { type: "model.call_failure", data: {} },
  ];
  const d = liveRunDiagnostics(events);
  assert.deepEqual(d.customAgents, ["explorer"]);
  assert.deepEqual(d.customAgentWarnings, ["w1"]);
  assert.deepEqual(d.customAgentErrors, []);
  assert.equal(d.permissionRequests, 1);
  assert.deepEqual(d.permissionResults, ["denied-no-approval-rule"]);
  assert.equal(d.modelCallFailures, 1);
  assert.equal(d.assistantMessageCount, 1);
  assert.ok(d.assistantMessageBytes > 0);
  assert.doesNotMatch(JSON.stringify(d), /PRIVATETRANSCRIPTMARKER/);
});

test("live Todo 6 hook acceptance does not reject a completed run with no attempted root stop", () => {
  assert.equal(liveHookAcceptance({ hooks: { rootBlocks: 0, workerBlocks: 0 }, runtimeCompleted: true }), true);
  assert.equal(liveHookAcceptance({ hooks: { rootBlocks: 0, workerBlocks: 0 }, runtimeCompleted: false }), false);
  assert.equal(liveHookAcceptance({ hooks: { rootBlocks: 1, workerBlocks: 0 }, runtimeCompleted: false }), true);
  assert.equal(liveHookAcceptance({ hooks: { rootBlocks: 1, workerBlocks: 1 }, runtimeCompleted: true }), false);
});

test("live Todo 6 diagnostics correlate denied permissions and retain only a safe subject", () => {
  const events = [
    {
      type: "permission.requested",
      data: {
        requestId: "denied-request",
        permissionRequest: {
          kind: "shell",
          toolCallId: "shell-call-1",
          fullCommandText: `GITHUB_TOKEN=supersecretvalue git -C /private/worktree add -- result.txt ${"A".repeat(240)}`,
        },
      },
    },
    {
      type: "permission.completed",
      data: {
        requestId: "unrelated-request",
        toolCallId: "unrelated-call",
        result: { kind: "approved" },
      },
    },
    {
      type: "permission.completed",
      data: {
        requestId: "denied-request",
        toolCallId: "shell-call-1",
        result: { kind: "denied-no-approval-rule-and-could-not-request-from-user" },
      },
    },
    { type: "assistant.message", data: { text: "PERMISSION_TRANSCRIPT_MARKER" } },
  ];
  const d = liveRunDiagnostics(events);
  assert.deepEqual(d.permissionResults, ["denied-no-approval-rule-and-could-not-request-from-user"]);
  assert.equal(d.permissionDenials.length, 1);
  assert.equal(d.permissionDenials[0].toolName, "shell");
  assert.equal(d.permissionDenials[0].toolCallId, "shell-call-1");
  assert.match(d.permissionDenials[0].subject, /git -C \/private\/worktree add -- result\.txt/);
  assert.ok(d.permissionDenials[0].subject.length <= 200);
  assert.equal(d.permissionDenials[0].subject.at(-1), "…");
  assert.doesNotMatch(d.permissionDenials[0].subject, /supersecretvalue/);
  assert.doesNotMatch(JSON.stringify(d), /PERMISSION_TRANSCRIPT_MARKER/);
  assert.doesNotMatch(JSON.stringify(d), /supersecretvalue/);
});

test("live Todo 6 diagnostics record permission requests that never completed", () => {
  const events = [
    {
      type: "permission.requested",
      data: {
        requestId: "inflight-request",
        permissionRequest: {
          kind: "shell",
          toolCallId: "shell-call-2",
          fullCommandText: "git -C /private/worktree commit -m 'Todo 6 writer result'",
        },
      },
    },
    { type: "assistant.message", data: { text: "UNRESOLVED_TRANSCRIPT_MARKER" } },
  ];
  const d = liveRunDiagnostics(events);
  assert.equal(d.permissionRequests, 1);
  assert.deepEqual(d.permissionResults, []);
  assert.deepEqual(d.permissionDenials, []);
  assert.equal(d.permissionUnresolved.length, 1);
  assert.equal(d.permissionUnresolved[0].toolName, "shell");
  assert.equal(d.permissionUnresolved[0].toolCallId, "shell-call-2");
  assert.match(d.permissionUnresolved[0].subject, /git -C \/private\/worktree commit/);
  assert.doesNotMatch(JSON.stringify(d), /UNRESOLVED_TRANSCRIPT_MARKER/);
});

test("live Todo 6 serializes interpreter commands so shell(node:*) can match them", () => {
  withFixture((paths) => {
    const contract = buildLiveTodo6Contract({ ...paths, baseline: "d".repeat(40) });
    // Attempt 9 showed that quoting the command stem defeats shell(node:*) even
    // when the interpreter name itself is bare; keep stems and syntax tokens plain.
    assert.match(contract.writerShellCommand, /^node -e/);
    assert.match(contract.resultVerifierShellCommand, /^node -e/);
    assert.match(contract.writerCommitShellCommand, /^git -C/);
    assert.match(contract.requiredRootShellCommands[2], /^git cherry-pick/);
    for (const command of contract.requiredRootShellCommands) {
      assert.doesNotMatch(command, /^'?\/[^ ]*\/node'?[ ]/);
    }
    assert.ok(contract.copilotArgs.includes("--allow-tool=shell(node:*)"));
    assert.equal(contract.copilotArgs.some((arg) => arg.startsWith("--allow-tool=shell(/")), false);
  });
});

test("live Todo 6 runtime verify keeps its nested interpreter bare for shell permission matching", () => {
  withFixture((paths) => {
    const contract = buildLiveTodo6Contract({ ...paths, baseline: "f".repeat(40) });
    for (const command of contract.requiredRootShellCommands.slice(3, 6)) {
      assert.match(command, /'--' node -e/);
      assert.doesNotMatch(command, /'--' ['\"]\/[^ ]+\/node['\"]/);
    }
  });
});

test("attempt-11 live packet stops immediately on permission denial", () => {
  const runner = readFileSync(join(import.meta.dirname, "..", ".litcodex", "evidence", "csw-hook-repair", "attempt-11", "live-runner.mjs"), "utf8");
  assert.match(runner, /\["permission",/);
  assert.match(runner, /tool\\.permission_denied/);
});

test("attempt-12 live packet preserves immediate permission-stop behavior", () => {
  const runner = readFileSync(join(import.meta.dirname, "..", ".litcodex", "evidence", "csw-hook-repair", "attempt-12", "live-runner.mjs"), "utf8");
  assert.match(runner, /\["permission",/);
  assert.match(runner, /tool\\.permission_denied/);
});

test("attempt-13 live packet preserves immediate permission-stop behavior", () => {
  const runner = readFileSync(join(import.meta.dirname, "..", ".litcodex", "evidence", "csw-hook-repair", "attempt-13", "live-runner.mjs"), "utf8");
  assert.match(runner, /\["permission",/);
  assert.match(runner, /tool\\.permission_denied/);
});

test("attempt-14 packet uses completion-aware hook acceptance", () => {
  const runner = readFileSync(join(import.meta.dirname, "..", ".litcodex", "evidence", "csw-hook-repair", "attempt-14", "live-runner.mjs"), "utf8");
  assert.match(runner, /liveHookAcceptance/);
  assert.doesNotMatch(runner, /hooks\.rootBlocks\s*>=\s*1/);
});

test("live Todo 6 isolates COPILOT_HOME and forbids combining the writer commands", () => {
  withFixture((paths) => {
    const copilotHome = join(paths.qa, "..", "copilot-home");
    const contract = buildLiveTodo6Contract({ ...paths, copilotHome, baseline: "e".repeat(40) });
    // A: the run must not inherit the user's installed plugins.
    assert.ok(isAbsolute(contract.copilotHome));
    assert.match(contract.copilotHome, /\/copilot-home$/);
    for (const root of [contract.qa, contract.writer]) {
      assert.ok(!contract.copilotHome.startsWith(`${root}/`));
    }
    const prompt = contract.copilotArgs[contract.copilotArgs.indexOf("-p") + 1];
    // The writer merged write && commit into one shell call in Attempt 7.
    assert.match(prompt, /separate bash/i);
    assert.match(prompt, /&&/);
  });
});

test("live Todo 6 flags ledger events written by a pre-repair copilot-swarm plugin", () => {
  const ledger = [
    JSON.stringify({ at: "t0", kind: "goal_created", objective: "o" }),
    JSON.stringify({ at: "t1", kind: "steering_flagged", verb: "skip", gate: "tests", text: "skip the tests" }),
    JSON.stringify({ at: "t2", kind: "steering_flagged", text: "CSW goal \"x QA\" is not complete" }),
  ].join("\n");
  const foreign = foreignPluginLedgerEvidence(ledger);
  assert.equal(foreign.length, 1);
  assert.match(foreign[0].text, /not complete/);
  assert.deepEqual(foreignPluginLedgerEvidence(""), []);
});

test("live Todo 6 seeds the isolated Copilot home so no trust prompt can block the run", () => {
  const config = isolatedCopilotConfig({ qa: "/run/qa", writer: "/run/writer", runRoot: "/run" });
  assert.deepEqual(config.installedPlugins, []);
  for (const path of ["/run", "/run/qa", "/run/writer"]) {
    assert.ok(config.trustedFolders.includes(path), path);
  }
  assert.equal(new Set(config.trustedFolders).size, config.trustedFolders.length);
});

test("live Todo 6 isolated Copilot config keeps host account state but drops installed plugins", () => {
  const baseConfig = {
    firstLaunchAt: "2026-01-01T00:00:00Z",
    lastLoggedInUser: { host: "https://github.com", login: "someone" },
    loggedInUsers: [{ host: "https://github.com", login: "someone" }],
    installedPlugins: [{ name: "copilot-swarm", cache_path: "/host/plugin" }],
    trustedFolders: ["/host/project"],
  };
  const config = isolatedCopilotConfig({ qa: "/run/qa", writer: "/run/writer", runRoot: "/run", baseConfig });
  assert.deepEqual(config.installedPlugins, []);
  assert.equal(config.firstLaunchAt, baseConfig.firstLaunchAt);
  assert.deepEqual(config.loggedInUsers, baseConfig.loggedInUsers);
  assert.deepEqual(config.lastLoggedInUser, baseConfig.lastLoggedInUser);
  for (const path of ["/host/project", "/run", "/run/qa", "/run/writer"]) {
    assert.ok(config.trustedFolders.includes(path), path);
  }
  assert.doesNotMatch(JSON.stringify(config), /\/host\/plugin/);
});
