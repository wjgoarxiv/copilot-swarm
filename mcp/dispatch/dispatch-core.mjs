// Dispatch core — pure, dependency-free logic for the CSW swarm.
//
// Copilot CLI has no model-callable "spawn subagent" primitive, so CSW restores
// model-driven parallel delegation by orchestrating parallel non-interactive
// `copilot -p` worker processes. This module holds the testable logic; the MCP
// stdio server (server.mjs) is a thin transport over it.

import { spawn } from "node:child_process";
import { redactText, safeMode, workerEnv } from "../../runtime/src/redact.mjs";

/** The conductor doctrine reminder attached to every dispatch result. */
export const DISTRUST_GUIDANCE =
  "Worker output is a CLAIM, not verified truth. Before accepting it: re-read the " +
  "actual diff, re-run the relevant tests, and re-run diagnostics yourself. " +
  "Delegate independent tasks in parallel; serialize only on a named dependency.";

/** Worker command (overridable for tests / custom installs). */
export function workerCommand() {
  return process.env.CSW_DISPATCH_CMD || "copilot";
}

const DEFAULT_TIMEOUT_MS = Number(process.env.CSW_DISPATCH_TIMEOUT_MS || 600000);
const DEFAULT_MAX_CONCURRENCY = Number(process.env.CSW_DISPATCH_CONCURRENCY || 4);
const HARD_CONCURRENCY_CAP = 16;

// Recursion guard. Workers are themselves `copilot` processes that load this same
// plugin (and its dispatch MCP), so an unbounded chain of re-dispatch would blow
// up process/cost exponentially. Each worker runs at depth+1; by default workers
// may NOT re-dispatch (max depth 1). Override with CSW_DISPATCH_MAX_DEPTH.
export const currentDepth = () => {
  const n = Number(process.env.CSW_DISPATCH_DEPTH || 0);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};
const maxDepth = () => {
  const n = Number(process.env.CSW_DISPATCH_MAX_DEPTH);
  return Number.isFinite(n) && n >= 0 ? n : 1;
};

const READ_ONLY_PREAMBLE =
  "[READ-ONLY TASK] Do not modify, create, or delete any files. Investigate and " +
  "report findings only.\n\n";
const RESEARCH_PREAMBLE =
  "[RESEARCH TASK] Investigate using available sources. Cite every external claim " +
  "with a pinned commit SHA or permalink so it is reproducible. Do not modify files.\n\n";

/** Built-in worker roster (shipped as copilot-swarm:* custom agents). */
export const ROSTER = ["explorer", "researcher", "planner", "gap-analyst", "plan-reviewer", "verifier"];

export const PERMISSION_PROFILES = {
  safe: {
    workerArgs: ["--deny-tool", "write"],
    tools: ["code_search", "research"],
    summary: "least privilege/read-mostly; dispatch is not exposed through generated MCP config",
  },
  balanced: {
    workerArgs: [],
    tools: ["dispatch", "code_search", "research"],
    summary: "recommended; no broad --allow-all-tools grant for mutating workers",
  },
  full: {
    workerArgs: ["--allow-all-tools"],
    tools: ["dispatch", "code_search", "research"],
    summary: "broad worker tool access; use only when explicitly trusted",
  },
  none: {
    workerArgs: [],
    tools: ["dispatch", "code_search", "research"],
    summary: "do not write CSW permission profile settings",
  },
};

export function normalizePermissionProfile(profile = process.env.CSW_PERMISSION_PROFILE || "balanced") {
  const p = String(profile || "balanced").toLowerCase();
  if (p === "custom") throw new Error("permission profile 'custom' is not implemented yet; use safe, balanced, full, or none");
  if (!PERMISSION_PROFILES[p]) throw new Error(`invalid permission profile: ${profile}`);
  return p;
}

/**
 * Resolve an agent name to what `copilot --agent` expects. Plugin agents are
 * namespaced `copilot-swarm:<name>`; auto-prefix bare roster names for convenience.
 * Already-namespaced names (containing ":") and non-roster names pass through.
 */
export function resolveAgent(name) {
  return !name.includes(":") && ROSTER.includes(name) ? `copilot-swarm:${name}` : name;
}

/** Build the argv for a single worker task. Pure + unit-tested. */
export function buildArgs(task) {
  if (!task || typeof task.prompt !== "string" || task.prompt.trim() === "") {
    throw new Error("each task requires a non-empty 'prompt'");
  }
  const mode = task.mode || "default";
  let prompt = task.prompt;
  if (mode === "read_only") prompt = READ_ONLY_PREAMBLE + prompt;
  else if (mode === "research") prompt = RESEARCH_PREAMBLE + prompt;

  const profile = normalizePermissionProfile(task.permissionProfile);
  const args = ["-p", prompt];
  args.push(...PERMISSION_PROFILES[profile].workerArgs);
  if (mode === "read_only" || mode === "research") {
    // Constrain workers away from mutation. Tool names per Copilot CLI permission model.
    if (!args.includes("--deny-tool")) args.push("--deny-tool", "write");
  }
  if (task.model) args.push("--model", String(task.model));
  if (task.agent) args.push("--agent", resolveAgent(String(task.agent)));
  return args;
}

/** Run a single worker. `spawnImpl` is injectable for tests. Always resolves. */
export function runOne(task, { spawnImpl = spawn, timeoutMs = DEFAULT_TIMEOUT_MS, now = () => Date.now(), env } = {}) {
  return new Promise((resolve) => {
    const fail = (msg, ms = 0) => resolve({ id: task?.id ?? null, ok: false, exitCode: null, output: "", error: msg, durationMs: ms });
    let args;
    try {
      args = buildArgs(task);
    } catch (err) {
      fail(err.message);
      return;
    }
    const started = now();
    let child;
    try {
      child = spawnImpl(workerCommand(), args, { stdio: ["ignore", "pipe", "pipe"], env: workerEnv(env || process.env, env?.CSW_DISPATCH_DEPTH ?? currentDepth() + 1) });
    } catch (err) {
      // Defensive: real spawn emits 'error' rather than throwing, but a custom
      // spawnImpl or exotic failure must not break batch failure-isolation.
      fail(err.message, now() - started);
      return;
    }
    let out = "";
    let err = "";
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };
    const timer = setTimeout(() => {
      try { child.kill("SIGKILL"); } catch {}
      finish({ id: task.id ?? null, ok: false, exitCode: null, output: redactText(out), error: `timeout after ${timeoutMs}ms`, durationMs: now() - started });
    }, timeoutMs);
    child.stdout?.on("data", (d) => { out += d.toString(); });
    child.stderr?.on("data", (d) => { err += d.toString(); });
    child.on("error", (e) => finish({ id: task.id ?? null, ok: false, exitCode: null, output: redactText(out), error: redactText(e.message), durationMs: now() - started }));
    child.on("close", (code) => finish({
      id: task.id ?? null,
      ok: code === 0,
      exitCode: code,
      output: redactText(out.trim()),
      error: code === 0 ? null : redactText(err.trim() || `exited with code ${code}`),
      durationMs: now() - started,
    }));
  });
}

/** Run an array of thunks with a bounded concurrency. */
async function withConcurrency(thunks, limit) {
  const results = new Array(thunks.length);
  let next = 0;
  async function worker() {
    for (;;) {
      const i = next++;
      if (i >= thunks.length) return;
      results[i] = await thunks[i]();
    }
  }
  const pool = Array.from({ length: Math.min(limit, thunks.length) }, worker);
  await Promise.all(pool);
  return results;
}

/**
 * Dispatch a batch of tasks in parallel.
 * @returns { results, guidance, summary }
 */
export async function runDispatch({ tasks, maxConcurrency } = {}, deps = {}) {
  if (safeMode()) throw new Error("dispatch disabled by CSW_SAFE_MODE");
  if (!Array.isArray(tasks) || tasks.length === 0) {
    throw new Error("'tasks' must be a non-empty array");
  }
  const depth = currentDepth();
  if (depth >= maxDepth()) {
    throw new Error(
      `dispatch depth limit (${maxDepth()}) reached; workers may not re-dispatch ` +
        `(raise CSW_DISPATCH_MAX_DEPTH to allow deeper nesting)`,
    );
  }
  const limit = Math.max(1, Math.min(Number(maxConcurrency) || DEFAULT_MAX_CONCURRENCY, HARD_CONCURRENCY_CAP));
  const inheritedProfile = normalizePermissionProfile(process.env.CSW_PERMISSION_PROFILE || "balanced");
  const normalized = tasks.map((t, i) => ({ ...t, permissionProfile: t.permissionProfile || inheritedProfile, id: t.id ?? `task-${i + 1}` }));
  const childEnv = workerEnv(process.env, depth + 1);
  const results = await withConcurrency(
    normalized.map((t) => () => runOne(t, { env: childEnv, ...deps })),
    limit,
  );
  const okCount = results.filter((r) => r.ok).length;
  return {
    results,
    guidance: DISTRUST_GUIDANCE,
    summary: { total: results.length, ok: okCount, failed: results.length - okCount, concurrency: limit },
  };
}

/** MCP tool definitions exposed by the dispatch server. */
export const TOOLS = [
  {
    name: "dispatch",
    description:
      "Delegate one or more INDEPENDENT tasks to parallel Copilot worker processes " +
      "and return their results. Use for parallelizable work; serialize dependent " +
      "steps yourself. Worker output is unverified — re-check diffs/tests/diagnostics.",
    inputSchema: {
      type: "object",
      properties: {
        tasks: {
          type: "array",
          minItems: 1,
          description: "Independent tasks to run in parallel.",
          items: {
            type: "object",
            properties: {
              id: { type: "string", description: "Optional stable id for the task." },
              prompt: { type: "string", description: "Self-contained task instructions (goal, scope, how the result is verified)." },
              mode: { type: "string", enum: ["default", "read_only", "research"], description: "default mutates; read_only/research deny file writes." },
              permissionProfile: { type: "string", enum: ["safe", "balanced", "full", "none"], description: "CSW worker permission profile. 'full' is the only profile that grants --allow-all-tools." },
              model: { type: "string", description: "Optional model id for this worker." },
              agent: { type: "string", description: "Optional custom agent name for this worker." },
            },
            required: ["prompt"],
          },
        },
        maxConcurrency: { type: "number", description: "Max workers to run at once (default 4, cap 16)." },
      },
      required: ["tasks"],
    },
  },
  {
    name: "code_search",
    description:
      "Read-only codebase investigation in a separate worker (cannot modify files). " +
      "Accepts one or more queries run in parallel. Returns findings only.",
    inputSchema: {
      type: "object",
      properties: {
        queries: { type: "array", minItems: 1, items: { type: "string" }, description: "What to find / investigate." },
        model: { type: "string" },
        permissionProfile: { type: "string", enum: ["safe", "balanced", "full", "none"], description: "CSW worker permission profile. Read-only mode still denies write." },
        maxConcurrency: { type: "number" },
      },
      required: ["queries"],
    },
  },
  {
    name: "research",
    description:
      "External/library research in a separate read-only worker. Every external claim " +
      "is cited with a pinned commit SHA or permalink. Queries run in parallel.",
    inputSchema: {
      type: "object",
      properties: {
        queries: { type: "array", minItems: 1, items: { type: "string" }, description: "Research questions." },
        model: { type: "string" },
        permissionProfile: { type: "string", enum: ["safe", "balanced", "full", "none"], description: "CSW worker permission profile. Research mode still denies write." },
        maxConcurrency: { type: "number" },
      },
      required: ["queries"],
    },
  },
];

/** Translate a tools/call request into a runDispatch invocation. Pure mapping. */
export function toDispatchInput(toolName, args = {}) {
  if (toolName === "dispatch") {
    return { tasks: args.tasks, maxConcurrency: args.maxConcurrency };
  }
  if (toolName === "code_search" || toolName === "research") {
    const mode = toolName === "code_search" ? "read_only" : "research";
    if (!Array.isArray(args.queries) || args.queries.length === 0) {
      throw new Error("'queries' must be a non-empty array");
    }
    return {
        tasks: args.queries.map((q, i) => ({ id: `${toolName}-${i + 1}`, prompt: String(q), mode, model: args.model, permissionProfile: args.permissionProfile })),
      maxConcurrency: args.maxConcurrency,
    };
  }
  throw new Error(`unknown tool: ${toolName}`);
}
