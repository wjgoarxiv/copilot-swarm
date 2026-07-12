---
name: swarm
description: Use when work contains two or more INDEPENDENT subtasks that can run at once (parallel investigation, multi-file changes, fan-out research, multi-lane review). Uses native Copilot task/fleet scheduling and integrates worker results skeptically.
---

# Swarm — parallel delegation for Copilot CLI

You are the **conductor**. Copilot CLI owns worker scheduling and lifecycle. You
conduct; workers play.

## When to use

- The task splits into **independent** subtasks (no shared mutable state, no ordering
  dependency between them). Parallelize those.
- You need isolated investigation while keeping your own context clean.
- You want fan-out research, or multi-lane review.

Do **not** parallelize steps that depend on each other's output — serialize those yourself.

## Native scheduling

- Use the host `task` subagent tool for model-driven delegation to focused workers.
- Use `/fleet` when the user asks for visible parallel execution.
- Use `/tasks` to inspect running work or cancel it.
- Native scheduling owns concurrency, timeout, and lifecycle behavior. Do not build
  or imply a second scheduler.

Each task `prompt` must be **self-contained**: state the goal, the scope, the inputs, and
how the result should be reported. Workers do not share your chat history.

Route each task to a focused worker when useful: `explorer`, `researcher`, `planner`,
`gap-analyst`, `plan-reviewer`, or `verifier`.

## Isolation is enforced by the host

- A prompt saying “do not modify files” does not make a task safe. Before launching
  an investigation worker, configure the host deny/available-tool policy so mutating
  tools are unavailable.
- Give every worker allowed to write a separate git worktree. Inspect the actual
  diff before integrating it.

## Discipline (non-negotiable)

A worker reporting success is a **claim, not evidence**. Before you accept any worker output:
1. re-read the actual diff,
2. re-run the relevant tests,
3. re-run diagnostics.

If a worker fails, is cancelled, or times out, inspect its native task state and
decide whether to retry, re-scope, or escalate; never treat failure as success.

## Example

> Investigate three subsystems independently, then integrate.

Launch three self-contained `task` subagents under a host policy that exposes only
non-mutating tools: “where is auth configured,” “where are sessions stored,” and
“where is rate limiting.” For user-visible parallelism use `/fleet`; monitor with
`/tasks`. Synthesize the findings yourself and verify cited `path:line` references.
