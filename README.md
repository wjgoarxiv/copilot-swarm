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

> Status: **0.1.0.**

## What's inside

- **Swarm dispatch MCP** — model-callable parallel delegation over `copilot -p`
  (tools: `dispatch`, `code_search`, `research`).
- **Agent roster** — focused workers (explorer, researcher, planner, gap-analyst,
  plan-reviewer, verifier) plus a conductor doctrine injected every session.
- **Durable goal runtime** — evidence-gated success criteria, completion oracle,
  steering guard, append-only ledger, stored under `.csw/`.
- **Workflow skills** — `swarm`, `csw-plan`, `csw-work`, `csw-review`.
- **Hooks** — session doctrine injection, steering audit, comment checks, and a
  continuation gate that keeps work going until the goal's oracle passes.

## Requirements

- GitHub Copilot CLI (`copilot`)
- Node.js >= 20

## Install

```sh
npm install -g copilot-swarm
csw install            # registers the plugin with Copilot CLI
# or, directly:
copilot plugin install <owner>/<repo>
```

Then start a session with `copilot`. The skills are available as
`/copilot-swarm:swarm`, `/copilot-swarm:csw-plan`, `/copilot-swarm:csw-work`, and
`/copilot-swarm:csw-review`; run `csw status` to check the install.

## Development

```sh
npm test          # unit tests
npm run scan      # forbidden-token cleanliness scan (all surfaces)
npm run pack:dry-run
```

## License

MIT — see [LICENSE](LICENSE).
