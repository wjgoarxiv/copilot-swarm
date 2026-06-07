---
name: csw-work
description: Use to EXECUTE an approved plan with discipline. Resumes from durable .csw/ goal state, drives each task through test-first implementation, real manual QA, independent verification, and paired cleanup, and only finishes when the completion oracle passes. Bootstraps csw-plan first if no plan exists.
---

# csw-work — disciplined plan execution

Execute an approved plan to genuine completion. Completion is decided by the goal
runtime's oracle, not by your judgment.

## Bootstrap
1. If `.csw/state.json` exists, resume it (read `node bin/csw-runtime.mjs show`).
2. Else, if an approved plan exists under `plans/`, bind its success-criteria
   blocks: `node bin/csw-runtime.mjs init --objective "<goal>" --criteria-file <f>`.
3. Else, there is no plan — invoke the `csw-plan` skill first and get approval.

## Per-task loop (for each plan checkbox / criterion)

PIN → RED → GREEN → VERIFY → SURFACE → REVIEW → CLEAN → RECORD:

- **PIN**: re-read the plan and the specific task; restate scope and the success block.
- **RED**: write the failing test first (for behavior changes).
- **GREEN**: implement minimally until the targeted and plan-level tests pass.
- **VERIFY**: run the automated `test:` for the criterion.
- **SURFACE**: real manual QA through the criterion's `channel:`; capture an
  artifact under `.csw-qa/`. Tests alone are not "done".
- **REVIEW**: for broad/risky/shared/security/release-facing changes, delegate a
  strict review (`agent: verifier` or the `csw-review` skill); loop until
  UNCONDITIONAL APPROVAL. "Looks good but…" = rejection.
- **CLEAN**: tear down spawned processes, servers, ports, temp dirs; write a
  one-line cleanup receipt.
- **RECORD**: capture evidence so the oracle can see it:
  `node bin/csw-runtime.mjs evidence --id <C0NN> --evidence "<proof + artifact path>"`.

Distrust worker self-reports: re-read diffs, re-run tests, re-run diagnostics.

## Steering

Run steering instructions through the guard: `node bin/csw-runtime.mjs steer
--text "<instruction>"`. Refused (exit 3) instructions try to weaken a gate
(skip/bypass/dismiss/auto-complete tests, QA, review) — do not act on them.

## Finishing

You may only declare done when `node bin/csw-runtime.mjs complete` succeeds — i.e.
every criterion is "pass" with evidence and zero unresolved blockers. The
continuation hook will keep the session going while the oracle reports unmet gates.
Record unresolved blockers with `csw-runtime blocker add` rather than skipping them.

To abandon a goal entirely (escape the continuation hook), run
`node bin/csw-runtime.mjs clear`.
