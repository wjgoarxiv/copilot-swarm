<p align="center"><img src="./cover.png" width="100%" /></p>

<h1 align="center">copilot-swarm</h1>
<p align="center">
  <em>Parallel task delegation and an evidence-gated plan &rarr; execute &rarr; review workflow, native to the GitHub Copilot CLI.</em>
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
> CSW turns `copilot` into a **swarm** — running independent subtasks in parallel —
> and wraps work in a disciplined plan → execute → review loop whose "done" is
> decided by an **evidence-gated oracle**, not by assertion. It is built entirely
> on Copilot CLI's native extension surfaces (plugin manifest, skills, custom
> agents, hooks, MCP) with **zero runtime dependencies**.

## Features

- **Swarm dispatch (MCP)** — Copilot CLI has no model-callable subagent-spawn, so CSW
  ships a zero-dependency MCP server that orchestrates parallel `copilot -p` workers:
  `dispatch`, `code_search`, `research`. Bounded concurrency, per-worker timeout,
  failure isolation, recursion guard.
- **Worker roster** — six focused custom agents: `explorer`, `researcher`, `planner`,
  `gap-analyst`, `plan-reviewer`, `verifier`.
- **Evidence-gated goal runtime** — machine success criteria
  (`C0NN | channel: | test: | scenario:`), a completion oracle that requires every
  criterion to pass *with captured evidence* and zero open blockers, a steering guard
  that refuses gate-weakening, and an append-only ledger under `.csw/`.
- **Workflow skills** — `swarm`, `csw-plan` (explore-first planning with an approval
  gate), `csw-work` (disciplined execution), `csw-review` (multi-lane, all-or-nothing).
- **Hooks** — session doctrine injection, steering audit, an anti AI-slop comment
  check, and a continuation gate that keeps work going until the oracle passes.
- **HUD** — a live status line showing the active goal's criteria progress and blockers.
- **Install UX** — a polished `csw` CLI (banner, themes, status/install/doctor).

## Quick Start

> [!TIP]
> Requires the [GitHub Copilot CLI](https://docs.github.com/copilot/how-tos/copilot-cli)
> and Node.js >= 20.

```sh
npm install -g copilot-swarm    # (after publish) — or see "From source" below
csw install                     # registers the plugin with Copilot CLI
csw status                      # verify
copilot                         # start a session — CSW is active
```

### From source (before npm publish)

```sh
git clone <owner>/<repo> copilot-swarm && cd copilot-swarm
npm pack                                    # build copilot-swarm-0.1.0.tgz
npm install -g ./copilot-swarm-0.1.0.tgz    # clean copy (avoid `npm i -g .` — it symlinks the dev tree)
csw install
```

## Usage

In a `copilot` session:

- **Parallelize** — just ask: *"investigate auth, session storage, and rate limiting in
  parallel"*. CSW dispatches read-only workers and you integrate the results skeptically.
- **Plan** — `/copilot-swarm:csw-plan` runs explore-first research, interviews you on
  genuine unknowns, and stops at an approval gate before writing one decision-complete plan.
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
| Parallel delegation | CSW dispatch MCP over `copilot -p` workers |
| Worker roster | `agents/*.agent.md` (namespaced `copilot-swarm:*`) |
| Always-on doctrine | `sessionStart` hook injecting `additionalContext` |
| Goal state / oracle | self-managed `.csw/` (JSON state + JSONL ledger) |
| Continuation | `agentStop` / `subagentStop` hook (force-continue) |
| Steering / comments | `userPromptSubmitted` / `postToolUse` hooks |
| HUD | Copilot `statusLine` |

See [`docs/supporting-components.md`](docs/supporting-components.md) for the
port / keep-native / skip decisions (e.g. LSP stays native).

## Development

```sh
npm test            # unit + e2e tests (Node test runner)
npm run scan        # forbidden-token cleanliness scan (all surfaces)
npm run pack:dry-run
python3 generate_cover.py   # regenerate the cover image
```

## License

MIT — see [LICENSE](LICENSE). No telemetry, no call-home.
