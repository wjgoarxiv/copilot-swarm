# HANDOFF — Copilot-swarm (CSW)

## Where we are

- **Plan:** `plans/0001-csw-port.md` (approved). Full native port of a reference
  plugin into `copilot-swarm` v0.1.0.
- **Branch:** `feat/csw-0.1.0` (never commit to `main` directly).
- **Phase 0 evidence:** `# REFERENCE/_CSW_NOTES.md` (git-ignored — Copilot CLI
  contract, reference inventory, alias map, forbidden-token list).
- **Native goal:** bound via the harness `/goal <completion condition>` surface.

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
- [x] **M9** — Install UX (csw CLI: banner/themes/status/install/doctor) + absolute runtime-command injection (fixes M5 PATH finding). 112 tests; reviewer UNCONDITIONAL APPROVAL.
- [x] **M10** — Release prep 0.1.0. All version surfaces 0.1.0; 112 tests green;
  scanner clean on all 3 surfaces; `npm pack` = `copilot-swarm@0.1.0`, 35 files, ~30 kB;
  release-tarball install token-free; FINAL release reviewer gate UNCONDITIONAL APPROVAL.
  **Publish: deferred — awaiting explicit user approval.**

- [x] **Post-release: `csw` keyword → `csw-loop`** — typing `csw` runs the full
  evidence-bound loop. Ported from the reference's "keyword → loop" UserPromptSubmit-hook
  trigger, but adapted: Copilot does NOT deliver `userPromptSubmitted` `additionalContext`
  to the model, so the trigger is a `csw-loop` skill (auto-activates on description) + the
  `sessionStart` doctrine (AGENTS.md "Keyword: `csw`"). Scanner extended with the
  sibling-port family brand tokens (see `# REFERENCE/_CSW_NOTES.md §6`). 132 tests; reviewer
  UNCONDITIONAL APPROVAL. NOT live-tested (Copilot quota out) — reuses M4 (skill activation)
  + M6 (sessionStart doctrine) verified surfaces; content-probe when quota returns.

## STATUS: ALL MILESTONES COMPLETE — release-ready, publish pending user approval.

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

## ⚠️ npm publish — DO LATER (deferred, not now)

**Do NOT `npm publish` yet.** Publishing is intentionally postponed to a later time
(user's instruction + RESTRAINT R6). The package is release-ready and works via local
install today; publishing happens only when explicitly decided later.

When publishing later:
1. Set `## [0.1.0] - <date>` in CHANGELOG; add `repository`/`homepage` to package.json
   (also makes npmjs.com resolve the README's relative `./cover.png`, which is
   intentionally **not bundled** in the tarball to keep it lean — it is tracked in git
   for the GitHub README only).
2. `npm publish` (or push to GitHub and `copilot plugin install <owner>/<repo>`).
3. Push `feat/csw-0.1.0` and fast-forward `main` (per approval).

## Local install (works now, no publish needed)

```sh
npm pack && npm install -g ./copilot-swarm-0.1.0.tgz   # prints the TUI install banner
csw install && csw status
```
(`npm install -g .` is NOT recommended — it symlinks the dev tree; `csw install` now
packs the allowlisted set so the installed plugin is clean regardless.)
