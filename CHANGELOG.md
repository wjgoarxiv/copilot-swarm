# Changelog

All notable changes to Copilot-swarm (CSW) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

No unreleased changes.

## [0.1.4] - 2026-08-23

### Added
- Added ten Copilot-native specialist skills covering debugging, interviewing,
  programming, refactoring, AI-code cleanup, frontend design, visual QA, Git,
  hierarchical repository guidance, and native LSP setup.
- Added a `postToolUseFailure` recovery hook that provides static root-cause
  guidance without reflecting untrusted error text.
- Expanded all 15 workflow and specialist skills into layered operational packages
  with linked decision tables, edge-case procedures, templates, verification packets,
  and a reproducible `npm run audit:skills` depth audit.

### Changed
- Clarified that native `task`/`fleet` are the execution substrate while CSW's
  durable evidence-gated completion layer owns the goal ledger and completion oracle.

## [0.1.3] - 2026-07-12

### Fixed
- Linked the bundled `csw-plan` workflow reference from `SKILL.md` so Awesome
  Copilot's orphan-file quality gate can verify that every shipped skill asset is
  reachable.

## [0.1.2] - 2026-07-12

### Changed
- Migrated active delegation guidance to Copilot CLI's native `task` subagents,
  `/fleet` parallel execution, and `/tasks` oversight/cancellation; removed the
  custom dispatcher from the shipped plugin.
- Replaced generated install permission profiles with simple install/dry-run flows
  and host-native permission guidance. Investigation safety now requires host tool
  restrictions, while writing workers require isolated worktrees.
- Hardened completion evidence around machine-generated `verify` and `artifact`
  receipts. Free-text evidence can report failure or pending context but cannot pass
  a criterion.
- Limited continuation to the root `agentStop` surface. Missing, malformed, empty,
  stale, completed, and safe-mode state intentionally fail open rather than trapping
  the host.
- Documented the accepted receipt boundary: Git freshness excludes ignored inputs,
  non-git verification has no freshness guarantee, and timeout/cancel process-tree
  cleanup is best-effort. Verified commands must be approved and non-daemonizing;
  ignored inputs and cleanup require explicit receipts.

## [0.1.1] - 2026-06-19

### Added
- Release preflight checks for version lockstep, README-linked package payloads,
  and exclusion of local CSW evidence artifacts from npm packages.
- Deterministic redaction for CSW runtime state, ledger, hook snippets, and MCP
  worker summaries before they are persisted or surfaced.
- Safe mode (`CSW_SAFE_MODE=1`) and stale-state fail-open behavior for continuation,
  disabling hook context emission/auditing, and dispatch escape hatches.
- Install-time permission profiles (`safe`, `balanced`, `full`, `none`) for npx and
  local `csw install` flows, including dry-run reporting and MCP tool/profile wiring.

### Changed
- npm `prepublishOnly` now runs tests, forbidden-token scans, release checks, and a
  dry-run package build before any human-gated publish attempt.
- The npm payload now includes README-linked local assets/docs (`cover.png`,
  `README-Ko-KR.md`, and `docs/`).

## [0.1.0] - 2026-06-07

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
  all-or-nothing review), and `csw-loop` — typing the **`csw`** keyword runs the full
  evidence-bound autonomous loop (goal → plan → test-first execute → QA → review →
  oracle), declared in the session-start doctrine so it activates on the keyword.
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
