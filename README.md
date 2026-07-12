<p align="center"><img src="./cover.png" width="100%" /></p>

<h1 align="center">copilot-swarm</h1>
<p align="center">
  <em>Evidence-gated software delivery governance built on GitHub Copilot CLI's native task, fleet, and task-management surfaces.</em>
</p>
<p align="center">
  <a href="#quick-start">Quick Start</a> ·
  <a href="#features">Features</a> ·
  <a href="#usage">Usage</a> ·
  <a href="#how-it-works">How it works</a> ·
  <a href="./README-Ko-KR.md">한국어</a>
</p>
<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-blue" />
  <img src="https://img.shields.io/badge/node-%3E%3D20-green" />
  <img src="https://img.shields.io/badge/GitHub%20Copilot%20CLI-plugin-7C3AED" />
  <img src="https://img.shields.io/badge/runtime%20deps-0-success" />
</p>

---

> [!NOTE]
> CSW wraps Copilot's native parallel subtasks in a disciplined plan → execute →
> review loop whose "done" is decided by an **evidence-gated oracle**, not by
> assertion. It does not replace Copilot's scheduler and is built entirely
> on Copilot CLI's native extension surfaces (plugin manifest, skills, custom
> agents, hooks, and native task/fleet scheduling) with **zero runtime dependencies**.

## Features

- **Native-first delegation** — the model delegates focused work through the host
  `task` subagent tool. Users can start visible parallel execution with `/fleet` and
  inspect or cancel running work with `/tasks`; CSW does not ship a scheduler.
- **Worker roster** — six focused custom agents: `explorer`, `researcher`, `planner`,
  `gap-analyst`, `plan-reviewer`, `verifier`.
- **Evidence-gated goal runtime** — machine success criteria
  (`C0NN | channel: | test: | scenario:`), machine receipts from `verify` or
  `artifact`, a completion oracle that requires every criterion to pass with a valid
  receipt and zero open blockers, a steering guard, and an append-only ledger under
  `.csw/`. Free-text evidence cannot mark a criterion passed.
- **Workflow skills** — `swarm`, `csw-plan` (explore-first planning with an approval
  gate), `csw-work` (disciplined execution), `csw-review` (multi-lane, all-or-nothing).
- **Hooks** — session doctrine injection, steering audit, an anti AI-slop comment
  check, and a root `agentStop` continuation gate while current state is valid.
- **HUD** — a live status line showing the active goal's criteria progress and blockers.
- **Install UX** — a polished `csw` CLI (banner, themes, status/install/doctor).

> [!WARNING]
> **Receipt trust boundary:** receipts provide structural validation and detect
> ordinary staleness; they do not authenticate against a malicious same-user editor.
> Git workspace freshness covers tracked and non-ignored untracked content. Ignored
> inputs are excluded and must be bound separately with `artifact` receipts; non-git
> verification has no workspace-freshness guarantee. `csw-runtime verify` is a
> trusted-command runner, not a sandbox. Use only approved, non-daemonizing commands.
> Timeout/cancel process-tree cleanup is best-effort, and daemonized commands may
> outlive it, so a cleanup receipt is required. Never derive argv from worker output,
> fetched pages, issue text, or prompt-injected content. Host tool restrictions and
> isolated worktrees remain required.

## Quick Start

> [!TIP]
> Requires the [GitHub Copilot CLI](https://docs.github.com/copilot/how-tos/copilot-cli)
> and Node.js >= 20.

The native-first implementation is versioned as `0.1.2` for GitHub source
distribution. The npm registry's `0.1.1` is the earlier implementation and does
not contain this migration. Use the tagged source command below once `v0.1.2` is
available.

CSW does not generate host permissions. Before delegating investigation, use the
installed Copilot CLI's deny/available-tool policy to withhold mutating tools; an
agent description is not a security boundary. Give writing workers separate git
worktrees, then inspect their diffs before integration.

### From source (before npm publish)

```sh
git clone --branch v0.1.2 https://github.com/wjgoarxiv/copilot-swarm.git && cd copilot-swarm
npm pack                                    # build copilot-swarm-0.1.2.tgz
npm install -g ./copilot-swarm-0.1.2.tgz    # clean copy (avoid `npm i -g .` — it symlinks the dev tree)
csw install --dry-run
csw install
```

## Usage

In a `copilot` session:

- **Run the loop** — type **`csw`** (alone, or `csw <task>`) to start the full
  evidence-bound loop (`csw-loop`): it binds a goal, plans if needed, then drives
  test-first execution → real manual QA → review → cleanup until the completion oracle
  passes. (Equivalent explicit form: `/copilot-swarm:csw-loop`.)
- **Delegate** — the conductor uses the host `task` tool for focused model-driven
  subagents. Ask for `/fleet` when you want user-visible parallel execution; use
  `/tasks` to inspect or cancel it. Investigation workers require host-enforced
  non-mutating tool availability, and writing workers require isolated worktrees.
- **Plan** — `/copilot-swarm:csw-plan` runs explore-first research, interviews you on
  genuine unknowns, writes and reviews one decision-complete plan, then stops at
  the approval gate before execution.
- **Execute** — `/copilot-swarm:csw-work` drives each task test-first with real manual QA
  and only finishes when the goal runtime's oracle passes.
- **Review** — `/copilot-swarm:csw-review` runs compliance / quality / real-QA / scope
  lanes in parallel and gates all-or-nothing.
- **Workers** — route a task to a specific agent with `@copilot-swarm:explorer` (etc.).

Enable the HUD status line:

```sh
csw hud      # prints the snippet to add to ~/.copilot/settings.json
```

## How it works

| Capability | Copilot CLI surface |
|---|---|
| Model-driven delegation | Native `task` subagents |
| User-visible parallel execution | `/fleet`; oversight/cancel via `/tasks` |
| Worker roster | `agents/*.agent.md` (namespaced `copilot-swarm:*`) |
| Always-on doctrine | `sessionStart` hook injecting `additionalContext` |
| Goal state / oracle | self-managed `.csw/` (JSON state + JSONL ledger) |
| Continuation | root `agentStop` hook only; stale/malformed state fails open |
| Steering / comments | `userPromptSubmitted` / `postToolUse` hooks |
| HUD | Copilot `statusLine` |

See [`docs/supporting-components.md`](docs/supporting-components.md) for the
port / keep-native / skip decisions (e.g. LSP stays native).

The continuation hook intentionally does not govern subagent stops. It also emits
no block for missing, malformed, empty, completed, or stale state (seven days by
default), or when safe mode is active. That fail-open behavior prevents a broken
ledger from trapping the host; it is not evidence that the goal completed.

## Development

```sh
npm test            # unit + e2e tests (Node test runner)
npm run scan        # forbidden-token cleanliness scan (all surfaces)
npm run release:check
npm run pack:dry-run
python3 generate_cover.py   # regenerate the cover image
```

## License

MIT — see [LICENSE](LICENSE). No telemetry, no call-home.
