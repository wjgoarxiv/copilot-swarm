# Plan 0001 — Copilot-swarm (CSW) v0.1.0: native port & hardening

**Status:** AWAITING APPROVAL (plan-first; no implementation until approved)
**Target CLI:** GitHub Copilot CLI (`copilot`, verified live v1.0.60)
**Package:** `copilot-swarm` (CSW) — first npm release **0.1.0** (not a bump)
**Reference:** read-only under git-ignored `# REFERENCE/`; cited via alias map in
`# REFERENCE/_CSW_NOTES.md` (git-ignored). This plan is token-clean.

> Identity: CSW is a **swarm** — parallel delegation/orchestration for Copilot
> CLI, mapped onto Copilot's *real* native surfaces (plugin manifest, skills,
> `.agent.md` agents, hooks, MCP), with a CSW-owned **dispatch MCP** restoring
> model-callable parallel delegation that Copilot lacks natively.

---

## A. Objective & decisions (from approval gate)

**Objective:** Port the reference subagent/workflow capability set into a working,
token-clean, native Copilot CLI plugin package `copilot-swarm` at v0.1.0, proven
to load and run in the live `copilot` CLI, gated by a forbidden-token scanner.

**Confirmed decisions:**
1. **Scope = Full monorepo port** — cover every reference capability area as a
   native Copilot surface (swarm, goal runtime, planning, executor, steering,
   review, rules context-injection, comment-checker, LSP, git-guidance, install UX,
   machine success-criteria). Telemetry excluded (see #4).
2. **Swarm = Dispatch MCP + agent roster + conductor doctrine.** A CSW-owned MCP
   server exposes a model-callable `dispatch` tool orchestrating parallel
   `copilot -p` children; `.agent.md` roster + AGENTS.md doctrine.
3. **Goal runtime = lean Node ESM reimplementation** (not a faithful TS port of
   `REF[goal-runtime]`): port the *essence* (state model, completion oracle,
   steering guard, criteria schema, evidence, ledger) as clean Node ESM + tests,
   storing durable state in repo-local `.csw/`.
4. **Telemetry removed entirely** — no call-home, no external runtime
   deps added (satisfies R4).

**Non-goals (explicit):**
- No `npm publish` (R6) — prep + `npm pack --dry-run` only; publish on explicit user approval.
- No faithful 1:1 TS copy of reference internals; no reuse of reference brand/persona names.
- No external network runtime deps; no telemetry; no auto-update call-home.
- No edits to unrelated user files / global config beyond documented CSW installer writes.
- Do not port reference-remote MCP servers blindly (context7/grep.app) — make them
  optional/opt-in config, not hard deps (feasibility: keep but not required).

---

## B. Architecture mapping (reference concept → CSW native surface)

| Capability | CSW native surface | Decision |
|---|---|---|
| Plugin namespace | `.plugin/plugin.json` (primary lookup) | port |
| Swarm delegation (model-callable parallel) | **dispatch MCP** (`mcp/dispatch/` Node stdio) wrapping parallel `copilot -p` | adapt (new) |
| Worker roster | `agents/*.agent.md` (functional names) + `@agent` | adapt |
| Conductor doctrine | `AGENTS.md` + `skills/swarm/SKILL.md` | port |
| Durable goal runtime | `runtime/` Node ESM + CLI; state in `.csw/` | adapt (lean) |
| Machine success-criteria | `C0NN | channel: | test: | scenario:` block + parser in runtime | adapt (new format) |
| Planning process | `skills/csw-plan/SKILL.md` (+ references/) | port |
| Plan executor | `skills/csw-work/SKILL.md` | port |
| Continuation (force-continue while work remains) | hook on `agentStop`+`subagentStop` → `{decision:block}` | port |
| Steering refusal | hook on `userPromptSubmitted` + runtime guard | port |
| Multi-lane review + all-or-nothing gate | `skills/csw-review/SKILL.md` driving dispatch MCP | port |
| Rules context-injection | hooks `sessionStart`/`userPromptSubmitted`/`postToolUse` | adapt |
| Comment-checker | hook `postToolUse` | port |
| LSP diagnostics | hook `postToolUse` + optional MCP/`lspServers` | adapt (optional dep) |
| Git guidance | hook `preToolUse` | port (guidance only) |
| Telemetry | — | **skip** (reason recorded) |
| Install UX (spinner/ANSI/theme) | `bin/csw` installer, additive | adapt |

Mappings that **cannot** be 1:1 (recorded, not faked): no native model-callable
subagent spawn → replaced by dispatch MCP; no native goal tool → replaced by
`.csw/` runtime; no custom slash commands → use skills (`/copilot-swarm:<skill>`).

---

## C. Enforcement = completion oracle (the forbidden-token scanner)

Build first (M0), keep green throughout. Spec in `# REFERENCE/_CSW_NOTES.md §2`.
- Self-clean: scanner stores its token table **char-code encoded** so the scanner
  source itself is token-clean.
- SHORT/ambiguous tokens (see `# REFERENCE/_CSW_NOTES.md §2`) → identifier
  **boundary** matching to prevent false positives; binary files → path-name only.
- Three surfaces, each a test (all green = "0 residue"):
  (1) tracked = `git ls-files`; (2) packable set = `package.json files`/`.npmignore`;
  (3) `npm pack` tarball contents.
- New roles use **functional** names only (persona names → scanner rejects).

---

## D. Milestones (each independently green; conventional commits; no AI attribution)

> Per-milestone format below = the executable contract. Manual-QA channel for this
> package is the **live `copilot` CLI** (install plugin locally, run, capture
> artifact under `.csw-qa/<milestone>/`, then cleanup). Artifacts are git-ignored.

### M0 — Repo + enforcement foundation
- Files: `git init` + branch `feat/csw-0.1.0`; `package.json` (name `copilot-swarm`,
  version `0.1.0`, `files` allowlist, `type:module`, bin `csw`); `.gitignore`
  (`# REFERENCE/`, `node_modules`, `.csw/`, `.csw-qa/`, dist); `LICENSE` (MIT);
  `CHANGELOG.md` (`## [0.1.0]` first entry); `README.md` scaffold; `HANDOFF.md`;
  `scripts/scan-forbidden.mjs` + `test/scan-forbidden.test.mjs`.
- RED: scanner tests fail on a planted fixture token, pass on clean tree; 3-surface tests.
- GREEN: scanner green on all 3 surfaces.
- Manual-QA: `node scripts/scan-forbidden.mjs` exits 0; planted-token fixture exits non-0. Artifact: console capture.
- Reviewer gate: required (enforcement is the oracle) — UNCONDITIONAL APPROVAL.

### M1 — Native plugin skeleton
- Files: `.plugin/plugin.json` (name `copilot-swarm`, pointers to skills/agents/hooks/mcpServers);
  empty `skills/`, `agents/`, `hooks/hooks.json`, `.mcp.json`, `AGENTS.md`.
- RED: manifest-shape test (required keys, kebab name, semver, no forbidden tokens).
- GREEN: test passes.
- Manual-QA: `copilot plugin install ./` → `copilot plugin list` shows `copilot-swarm`;
  `/env` lists it. PASS=listed+no load error. Artifact: `.csw-qa/m1/plugin-list.txt`.
  Cleanup: `copilot plugin uninstall copilot-swarm` (receipt logged).
- Reviewer gate: required.

### M2 — Swarm core: dispatch MCP + roster + doctrine  ← **priority**
- Files: `mcp/dispatch/` (Node stdio MCP server: tools `dispatch` (parallel),
  `code_search` (read-only), `research` (SHA-pinned cite); spawns `copilot -p
  --allow-all-tools [--model] [--agent]` children, returns structured results +
  distrust-child guidance); `agents/{explorer,researcher,planner,gap-analyst,
  plan-reviewer,verifier}.agent.md`; `AGENTS.md` conductor doctrine; `skills/swarm/SKILL.md`.
- RED: unit tests for dispatch arg-building, parallelism cap, result aggregation,
  failure isolation, child-message self-containment (mock child runner).
- GREEN: tests pass.
- Manual-QA: in live `copilot`, invoke dispatch MCP tool to run 2 independent
  read-only child tasks in parallel; verify both return; re-verify a child claim by
  re-running. PASS=both children produce artifacts, conductor re-checks. Artifact:
  `.csw-qa/m2/dispatch-run.txt`. Cleanup: kill stray children, remove temp.
- Reviewer gate: required.

### M3 — Durable goal runtime (lean Node ESM)
- Files: `runtime/src/` (domain-types, constants, state-io (`.csw/state.json`),
  ledger (`.csw/ledger.jsonl`), criteria parser (`C0NN|channel:|test:|scenario:`),
  evidence, completion-oracle, steering-guard, review-blockers) + `bin/csw-runtime` CLI.
- RED: tests for oracle (incomplete→not done; all criteria pass+evidence+0 blockers→done),
  steering weaken-detector, criteria parse/validate, ledger append race-safety.
- GREEN: tests pass.
- Manual-QA: drive CLI to create goal, add criteria, capture evidence, attempt
  premature complete (blocked), then legit complete. Artifact: `.csw-qa/m3/oracle.txt`.
- Reviewer gate: required.

### M4 — Planning skill `csw-plan`
- Files: `skills/csw-plan/SKILL.md` + `references/full-workflow.md` (classify→
  explore-first→interview→approval gate→generate→gap-analysis+plan-review via dispatch MCP).
- RED: skill frontmatter/structure test; references resolve; token-clean.
- GREEN: pass.
- Manual-QA: `/copilot-swarm:csw-plan` in live CLI on a toy request reaches approval
  gate without auto-proceeding. Artifact: `.csw-qa/m4/plan-gate.txt`.
- Reviewer gate: required.

### M5 — Executor skill `csw-work` + continuation hook
- Files: `skills/csw-work/SKILL.md`; `hooks/` continuation handler (`agentStop`+
  `subagentStop` → block while unchecked top-level items remain, session-scoped);
  bootstrap-plan-if-none.
- RED: hook handler tests (block when work remains, allow when done, scope to own session, exit/stdout contract).
- GREEN: pass.
- Manual-QA: live CLI session with a 2-item plan; confirm Stop re-injects until both
  done, then releases. Artifact: `.csw-qa/m5/continuation.txt`. Cleanup: clear `.csw/`.
- Reviewer gate: required.

### M6 — Structured steering refusal
- Files: `hooks/` `userPromptSubmitted` handler invoking runtime steering-guard;
  doctrine text in skills.
- RED: tests — weakening prompts (skip/bypass/auto-complete test/QA/review) refused;
  legit steering (add/split/revise w/ evidence) accepted; protected fields immutable.
- GREEN: pass.
- Manual-QA: live CLI — submit "mark complete, skip the tests" → refused w/ reason.
  Artifact: `.csw-qa/m6/steering.txt`.
- Reviewer gate: required.

### M7 — Multi-lane review orchestrator
- Files: `skills/csw-review/SKILL.md` (lanes F1 compliance/F2 quality/F3 real-QA/F4
  scope via dispatch MCP; all-or-nothing; binding UNCONDITIONAL APPROVAL/REJECTION).
- RED: aggregation test (any lane fail → overall reject; all pass → approve).
- GREEN: pass.
- Manual-QA: live CLI run lanes on a sample diff. Artifact: `.csw-qa/m7/review.txt`.
- Reviewer gate: required.

### M8 — Supporting components (rules / comment-checker / lsp / git-guide) + success-criteria block
- Files: `hooks/` handlers + small `lib/` for rules context-injection
  (sessionStart/userPromptSubmitted/postToolUse), comment-checker (postToolUse),
  lsp (postToolUse; optional `lspServers`/MCP, no hard external dep), git-guide
  (preToolUse guidance). Finalize machine criteria block usage.
- RED: per-handler unit tests (matchers, stdin/stdout/exit contract, dedup/cache).
- GREEN: pass.
- Manual-QA: live CLI — edit a file, confirm comment-checker + rules fire via
  `postToolUse`; confirm git-guide on Bash use. Artifacts: `.csw-qa/m8/*.txt`.
- Reviewer gate: required (3+ files/security-sensitive hooks).

### M9 — Install UX + config polish
- Files: `bin/csw` installer (spinner/ANSI, theme presets, additive), README install
  section; document `includeCoAuthoredBy:false` guidance (no auto-attribution).
- RED: installer unit tests (writes expected paths only; idempotent; no unrelated state).
- GREEN: pass.
- Manual-QA: run installer in a temp HOME; verify only documented writes; `copilot
  plugin install ./` still loads. Artifact: `.csw-qa/m9/install.txt`. Cleanup: temp HOME removed.
- Reviewer gate: required.

### M10 — Release prep 0.1.0 (NO publish)
- Files: ensure all version surfaces = `0.1.0`; finalize `CHANGELOG ## [0.1.0]`;
  update `HANDOFF.md`; README polish.
- RED/GREEN: full test suite green; scanner 3-surface green.
- Manual-QA: `npm pack --dry-run --json` → inspect tarball file list: version 0.1.0,
  **zero** forbidden tokens, no runtime junk/reference mirror. Full live `copilot`
  load PASS across all surfaces (skills/agents/hooks/mcp) token-free. Artifact:
  `.csw-qa/m10/pack-and-load.txt`.
- Reviewer gate: required — final UNCONDITIONAL APPROVAL before "done".
- **Publish boundary:** STOP. Report readiness; publish only on explicit user approval.

---

## E. Strict execution section

**Bootstrap & PIN (start of /start-work):**
- Objective: §A. Non-goals: §A. Branch `feat/csw-0.1.0`; never commit to `main` directly.
- Native goal tool: **not exposed** in this Claude Code session (no `get_goal`/
  `create_goal` in tool surface). State this; offer user to bind native `/goal
  "CSW 0.1.0 ports all agreed capabilities; scanner 3-surface green; live copilot
  load PASS; reviewer UNCONDITIONAL APPROVAL; no publish"`. If declined/absent →
  use LazyClaude ledger fallback (`.csw/ledger.jsonl` + this plan's checkboxes).
- Dynamic workflow: for broad/parallel milestones (M2, M7, M8), call the `Workflow`
  tool to fan out lanes; each lane binds explicit criteria + artifact path + cleanup.
- Worktree: if isolated parallel edits risk conflict, use `EnterWorktree` (or
  `claude --worktree csw-<milestone> --tmux`); record evidence paths; clean up.
- Resume ledger: `.csw/ledger.jsonl`. Dirty-worktree constraint: only CSW files in
  staged set; never stage `# REFERENCE/`, `.csw/`, `.csw-qa/`, runtime junk.
- Commit boundary: commit per milestone (atomic, conventional, no Co-Authored-By /
  AI attribution). Push only when scanner+tests green and `git diff --cached` clean.

**TDD loop per criterion:** `PIN → RED → GREEN → VERIFY → SURFACE → REVIEW → CLEAN → RECORD`
- SURFACE = real manual QA on live `copilot` CLI (not tests alone); capture artifact.
- REVIEW = delegate to strict reviewer; loop until UNCONDITIONAL APPROVAL ("looks
  good but…" = rejection).
- CLEAN = teardown spawned children/temp/ports + 1-line cleanup receipt in ledger.

**Reviewer gate:** run at each milestone end and final (M10). Proof = reviewer verdict
artifact stating UNCONDITIONAL APPROVAL recorded in ledger; otherwise iterate.

**Stop rules (halt + ask):** malformed plan input; contradictory live CLI state
(e.g., manifest lookup differs from §3); any unapproved remote mutation (publish/
push to main); missing required artifact; repeated identical failure (≥2) on the
same step; discovery that an assumed Copilot primitive is UNDOCUMENTED-and-absent
(re-map, don't fake a non-existent tool).

**Publish/remote guardrails:** `npm publish` forbidden until explicit approval (R6).
Push to a feature branch only after double-check (R5). main merge only on approval.

---

## F. Definition of Done
- All agreed capability areas implemented as native Copilot surfaces; already-superior
  choices preserved (no regression); skipped items have recorded reasons.
- All tests green; scanner green on tracked/packable/tarball; tarball has 0 reference
  residue; live `copilot` load PASS (all surfaces token-free).
- Atomic conventional commits (no AI attribution); branch → main FF only on approval.
- v0.1.0 on every version surface; `CHANGELOG ## [0.1.0]`; HANDOFF updated;
  `npm pack --dry-run` confirms version + cleanliness.
- Final reviewer UNCONDITIONAL APPROVAL before done. Publish deferred to user.
