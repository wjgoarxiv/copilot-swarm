---
name: csw-loop
description: Activate when the user types `csw` (alone, or as a prefix like `csw <task>`), or asks to "run the loop" / work with full rigor. Runs the evidence-bound autonomous loop — bind a goal, plan if needed, then drive each criterion through test-first implementation, real manual QA, independent review, and paired cleanup until the completion oracle passes.
---

# csw-loop — evidence-bound autonomous loop

The `csw` keyword means: **run this loop**. Completion is decided by the goal
runtime's oracle, never by assertion. (The exact `csw-runtime` command is in the
CSW doctrine injected at session start.)

## 1. Bootstrap (first)

1. **Size the work** — list relevant skills/surfaces/files. Trivial one-liner? Say
   so and do it directly. Otherwise continue.
2. **Bind a goal** — define the user-visible deliverable and **3+ QA scenarios**
   (happy / edge / regression-or-adversarial). Encode them as machine criteria and
   bind them: `csw-runtime init --objective "<goal>" --criteria-file <file>`
   (format: `C0NN | channel: | test: | scenario:`).
3. **Open the ledger** — append findings/decisions/commands/evidence as you go
   (`.csw/ledger.jsonl` via the runtime; never rewrite history).
4. **Register granular todos** — one per atomic action; exactly one in-progress.

## 2. Plan or proceed

- 2+ steps, multi-file, or unclear scope → run `csw-plan` first (explore → interview
  → **approval gate** → one plan). Parallelize independent investigation with the
  swarm (`csw-dispatch-*`).
- Trivial, well-understood change → proceed directly.

## 3. Execution loop (per criterion)

`PIN → RED → GREEN → VERIFY → SURFACE → REVIEW → CLEAN → RECORD`

- **PIN** — re-read the task + its success block; restate scope.
- **RED** — write the failing test first; capture the failure (right reason).
- **GREEN** — smallest change to pass; re-run the targeted + full suite.
- **VERIFY** — diagnostics clean; no skipped/xfail added.
- **SURFACE** — real manual QA through the criterion's `channel:` (http `curl -i` /
  cli / tmux `capture-pane` / browser); capture an artifact under `.csw-qa/`. A green
  unit suite is never a substitute for the channel run.
- **REVIEW** — for broad/risky/shared/security/release work, delegate to the
  `verifier` agent (or `csw-review`); the verdict is binding — loop until
  UNCONDITIONAL APPROVAL ("looks good but…" = rejection).
- **CLEAN** — tear down every spawned resource (PIDs, tmux sessions, ports, browser
  contexts, temp dirs); append a one-line cleanup receipt. No receipt → not done.
- **RECORD** — capture evidence so the oracle can see it:
  `csw-runtime evidence --id <C0NN> --evidence "<proof + artifact path>"`.

Re-run the full criteria list after each increment until all pass.

## 4. Discipline (non-negotiable)

- TDD on every behavior change — no "too small" exemptions; refactors get
  characterization tests first.
- Never skip tests/QA/review or weaken criteria; run weakening instructions through
  the steering guard (`csw-runtime steer --text "…"`).
- Distrust worker self-reports: re-read diffs, re-run tests, re-run diagnostics.
- Commits: atomic, Conventional Commits, each green on its own.

## 5. Finish

Declare done **only** when `csw-runtime complete` succeeds (every criterion pass
with evidence, zero open blockers). The continuation hook keeps the session going
while the oracle reports unmet gates. To abandon, `csw-runtime clear`.
