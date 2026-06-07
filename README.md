# Copilot-swarm (CSW)

A native [GitHub Copilot CLI](https://docs.github.com/copilot/how-tos/copilot-cli)
plugin that turns `copilot` into a **swarm** — parallel task delegation and
orchestration — backed by an evidence-gated goal runtime and a disciplined
plan → execute → review workflow.

CSW is built entirely on Copilot CLI's real native extension surfaces: the plugin
manifest, skills, custom agents, hooks, and MCP servers. Because Copilot CLI has
no model-callable subagent-spawn primitive, CSW ships its own **dispatch MCP**
that orchestrates parallel `copilot -p` workers, restoring model-driven parallel
delegation.

> Status: **0.1.0, in development.** See `plans/0001-csw-port.md` for the roadmap.

## What's inside (planned for 0.1.0)

- **Swarm dispatch MCP** — model-callable parallel delegation over `copilot -p`.
- **Agent roster** — focused `.agent.md` workers (explorer, researcher, planner,
  gap-analyst, plan-reviewer, verifier) plus a conductor doctrine.
- **Durable goal runtime** — evidence-gated success criteria, completion oracle,
  steering guard, append-only ledger, stored under `.csw/`.
- **Workflow skills** — planning, execution, and multi-lane review.
- **Supporting hooks** — context-injection rules, comment checks, diagnostics,
  and a continuation gate that keeps work going until the plan is done.

## Requirements

- GitHub Copilot CLI (`copilot`)
- Node.js >= 20

## Install

Installation lands in a later milestone. The package will be installable as a
Copilot CLI plugin (`copilot plugin install ...`).

## Development

```sh
npm test          # unit tests
npm run scan      # forbidden-token cleanliness scan (all surfaces)
npm run pack:dry-run
```

## License

MIT — see [LICENSE](LICENSE).
