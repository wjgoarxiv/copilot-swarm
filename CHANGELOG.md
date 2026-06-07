# Changelog

All notable changes to Copilot-swarm (CSW) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - unreleased

First release: a native GitHub Copilot CLI plugin for parallel delegation and an
evidence-gated plan → execute → review workflow.

### Added
- **Native plugin** (`.plugin/plugin.json`) registering skills, custom agents,
  hooks, and an MCP server. Installs via `copilot plugin install` (or `csw install`).
- **Swarm dispatch MCP** (`mcp/dispatch/`) — a zero-dependency MCP stdio server that
  restores model-callable parallel delegation by orchestrating parallel `copilot -p`
  workers: tools `dispatch`, `code_search`, `research`. Bounded concurrency, per-worker
  timeout, failure isolation, and a recursion-depth guard.
- **Worker roster** — six focused custom agents: `explorer`, `researcher`, `planner`,
  `gap-analyst`, `plan-reviewer`, `verifier` (namespaced `copilot-swarm:*`).
- **Durable evidence-gated goal runtime** (`runtime/`, `bin/csw-runtime.mjs`) —
  machine success criteria (`C0NN | channel: | test: | scenario:`), atomic `.csw/`
  state + append-only JSONL ledger, a completion oracle (every criterion pass *with
  evidence* and zero open blockers), a steering guard that refuses gate-weakening, and
  a `clear` escape hatch.
- **Skills** — `swarm` (parallel delegation), `csw-plan` (explore-first planning with
  an approval gate), `csw-work` (disciplined execution), `csw-review` (multi-lane
  all-or-nothing review).
- **Hooks** — `sessionStart` doctrine injection (the always-on instruction vehicle),
  `userPromptSubmitted` steering audit, `postToolUse` comment-checker (anti AI-slop),
  and `agentStop`/`subagentStop` continuation gate (force-continue until the oracle
  passes).
- **Install UX** — `bin/csw` CLI with an ANSI banner, theme presets, and
  status/install/doctor commands.
- **HUD status line** — `bin/csw-statusline.mjs` for Copilot CLI's `statusLine`
  surface: shows the active goal's criteria progress, open blockers, and objective
  below the input (nothing when no goal is active). Enable via `csw hud`.
- **Release-cleanliness oracle** — `scripts/scan-forbidden.mjs` gating the tracked,
  packable, and `npm pack` tarball surfaces.

### Notes
- No telemetry, no call-home, no external runtime dependencies.
- LSP is delegated to Copilot's native support; see `docs/supporting-components.md`
  for the port/keep/skip rationale.
