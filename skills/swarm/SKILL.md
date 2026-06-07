---
name: swarm
description: Use when work contains two or more INDEPENDENT subtasks that can run at once (parallel investigation, multi-file changes, fan-out research, multi-lane review). Delegates to parallel Copilot workers via the csw-dispatch MCP tools and integrates their results skeptically.
---

# Swarm — parallel delegation for Copilot CLI

You are the **conductor**. Workers are parallel `copilot -p` processes launched by the
`csw-dispatch` MCP server. You conduct; workers play.

## When to use

- The task splits into **independent** subtasks (no shared mutable state, no ordering
  dependency between them). Parallelize those.
- You need read-only investigation while keeping your own context clean.
- You want fan-out research, or multi-lane review.

Do **not** parallelize steps that depend on each other's output — serialize those yourself.

## Tools

- `csw-dispatch-dispatch` — run independent `tasks` in parallel. Each task:
  `{ id?, prompt, mode?: default|read_only|research, model?, agent? }`. `maxConcurrency`
  defaults to 4 (cap 16). `default` may modify files; `read_only`/`research` cannot.
- `csw-dispatch-code_search` — read-only investigation; pass `queries: [...]`.
- `csw-dispatch-research` — external research with pinned-SHA citations; pass `queries: [...]`.

Each task `prompt` must be **self-contained**: state the goal, the scope, the inputs, and
how the result should be reported. Workers do not share your chat history.

Optionally route a task to a focused worker via `agent`: `explorer`, `researcher`,
`planner`, `gap-analyst`, `plan-reviewer`, `verifier`.

## Discipline (non-negotiable)

A worker reporting success is a **claim, not evidence**. Before you accept any worker output:
1. re-read the actual diff,
2. re-run the relevant tests,
3. re-run diagnostics.

If a worker fails or times out, its result is isolated — the others still return. Decide
whether to retry, re-scope, or escalate; never silently treat a failure as success.

## Example

> Investigate three subsystems in parallel, then integrate.

Call `csw-dispatch-code_search` with `queries: ["where is auth configured", "where are
sessions stored", "where is rate limiting"]`, then synthesize the three findings yourself
and verify the key claims by reading the cited `path:line` references.
