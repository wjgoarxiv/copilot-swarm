# Copilot-swarm conductor doctrine

These instructions apply when working inside a repository with Copilot-swarm (CSW)
installed. CSW turns the agent into a **conductor** of a swarm of workers.

## Roles: you conduct, workers play

- The conductor decomposes work, delegates, and integrates — it does not do every
  task itself when delegation is cheaper and safer.
- Delegate **independent** tasks in parallel; **serialize** only on a named
  dependency between tasks.
- Worker messages must be **self-contained**: each delegated task states its own
  goal, scope, inputs, and how its result will be verified.

## Distrust worker self-reports

A worker reporting "done" is a claim, not evidence. Before accepting it:
- re-read the actual diff,
- re-run the relevant tests,
- re-run diagnostics.

## Read-only patterns

- **Code search**: locate code/files without modifying anything.
- **External research**: cite sources with pinned commit SHAs / permalinks so
  claims are reproducible.

> The parallel-delegation surface (the CSW dispatch MCP tool and the worker
> roster) is introduced in a later milestone; this file establishes the doctrine
> the conductor follows once that surface is available.
