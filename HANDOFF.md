# HANDOFF — Copilot-swarm (CSW)

## Where we are

- **Plan:** `plans/0001-csw-port.md` (approved). Full native port of a reference
  plugin into `copilot-swarm` v0.1.0.
- **Branch:** `feat/csw-0.1.0` (never commit to `main` directly).
- **Phase 0 evidence:** `# REFERENCE/_CSW_NOTES.md` (git-ignored — Copilot CLI
  contract, reference inventory, alias map, forbidden-token list).
- **Native goal bound:** `/goal /lazyclaude:start-work`.

## Milestone progress

- [x] **M0** — Repo + forbidden-token scanner. Committed `8d09a43`. 13 tests green;
  3 surfaces clean; reviewer UNCONDITIONAL APPROVAL.
- [x] **M1** — Native plugin skeleton. 18 tests green; live `copilot plugin list`
  shows `copilot-swarm (v0.1.0)`; installed tree token-free (via clean export).
  Finding: direct local install copies whole dir → use clean export for QA; M9
  distribution targets marketplace/owner-repo (see notes §5).
- [x] **M2** — Swarm dispatch MCP + 6-agent roster + swarm skill. 54 tests green;
  reviewer UNCONDITIONAL APPROVAL. Live: model called `csw-dispatch-dispatch`, ran 2
  parallel `copilot -p` workers (QQAAQQ/ZZBBZZ); agents auto-namespaced `copilot-swarm:*`;
  `${PLUGIN_ROOT}` expands. Recursion depth guard (`CSW_DISPATCH_DEPTH`, default max 1).
- [x] **M3** — Durable evidence-gated goal runtime (lean Node ESM). 72 tests green;
  reviewer UNCONDITIONAL APPROVAL. Criteria block `C0NN | channel: | test: | scenario:`,
  atomic `.csw/` store + JSONL ledger, completion oracle (pass+evidence+0 blockers),
  steering guard (refuses skip/bypass/dismiss/auto-complete), CLI `bin/csw-runtime.mjs`.
- [x] **M4** — Planning skill `csw-plan`. Live content-probe activation PASS.
- [x] **M5** — Executor skill `csw-work` + continuation hook (agentStop/subagentStop) +
  `csw-runtime clear` escape hatch. 83 tests green; reviewer UNCONDITIONAL APPROVAL; live
  agentStop force-continue verified. Finding: expose `csw`/`csw-runtime` on PATH in M9.
- [x] **M6** — Structured steering refusal. `sessionStart` doctrine injector (the
  always-on instruction vehicle) + `userPromptSubmitted` audit hook + shared
  `hooks/lib/read-stdin.mjs`. 95 tests green; reviewer UNCONDITIONAL APPROVAL; live:
  model refused a weakening instruction citing the injected doctrine.
- [x] **M7** — Multi-lane review orchestrator skill `csw-review` (F1-F4 all-or-nothing). Live activation PASS.
- [x] **M8** — Supporting components: comment-checker (postToolUse) PORTED; LSP kept-native, rules/git-guide/telemetry skip (docs/supporting-components.md). 103 tests; reviewer UNCONDITIONAL APPROVAL; live additionalContext honored.
- [~] **M9** — Install UX (in progress).
- [ ] M10 release prep.

> KEY MECHANISM (live-verified): plugin `AGENTS.md` is NOT auto-loaded; inject
> always-on doctrine via a `sessionStart` hook's `additionalContext` (honored).
> `userPromptSubmitted` `additionalContext` is NOT surfaced to the model.

> NOTE: running `bin/csw-runtime.mjs` from the repo root writes to the repo's own
> git-ignored `.csw/` — drive QA/reviews in a temp `cwd` (or set `CSW_HOME`) to
> avoid polluting the milestone ledger.

## Key live-CLI findings (see `# REFERENCE/_CSW_NOTES.md §5`)
- Plugin MCP servers: `${PLUGIN_ROOT}` expands in `mcpServers` args; tools surface as
  `<server>-<tool>`; `copilot mcp list` does NOT show plugin servers.
- Plugin agents auto-namespaced `copilot-swarm:<name>`; `--agent` needs the full id.
- Direct local-path install copies the whole dir (ignores `files`/`.gitignore`) and is
  deprecated → QA from a clean `git archive` export; distribute via marketplace/owner-repo.

## Hard rules

- Zero reference-token residue (scanner gates tracked / packable / tarball).
- Functional role names only (no reference persona names).
- No `npm publish` and no push without explicit approval.
- No AI attribution in commits.

## Resume

Run `/lazyclaude:start-work` and continue the first unchecked milestone in the plan.
Ledger: `.csw/ledger.jsonl` (created during execution).
