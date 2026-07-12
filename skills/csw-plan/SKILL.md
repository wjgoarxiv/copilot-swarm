---
name: csw-plan
description: Use BEFORE implementing anything non-trivial — when a request is broad, multi-step, ambiguous, or risky and needs a decision-complete plan. Runs explore-first research, an interview on genuine unknowns, writes and self-reviews one plan, then stops at an explicit approval gate.
---

# csw-plan — decision-complete planning

Produce ONE decision-complete plan. Do not write product code in this skill.

## Phase 0 — Classify
State the request's shape: one-file change · multi-step feature · architectural
decision. Trivial one-liners do not need this skill; say so and stop.

## Phase 1 — Explore first (evidence before opinions)
Ground every claim in the actual codebase and sources. Parallelize independent
investigation with the swarm:
- internal: host `task` → `explorer` — where things live, how they connect,
  `path:line` evidence.
- external: host `task` → `researcher` — library/API facts, each pinned to a commit
  SHA / permalink.
Use `/fleet` for user-visible parallel execution and `/tasks` for oversight or
cancellation. Before investigation, use host deny/available-tool policy to remove
mutating tools; prose alone does not enforce non-mutation.
Re-read the cited evidence yourself; do not trust a worker's summary.

## Phase 2 — Interview (genuine unknowns only)
Ask the user ONLY about decisions you cannot resolve from the request, the code,
or sensible defaults — and where the answer changes the plan. Do not ask about
things you can verify. Present materially different interpretations rather than
silently picking one.

## Phase 3 — Generate ONE plan
Write a single plan file under `plans/`. It must be decision-complete:
- TL;DR; scope (must-have / must-NOT); verification strategy (tests + manual QA).
- Ordered tasks: each with concrete files, acceptance criteria, and a machine
  success-criteria block (`C0NN | channel: | test: | scenario:`) the goal runtime
  can ingest (`bin/csw-runtime.mjs init`).
- A final verification wave (compliance, code review, real manual QA, scope fidelity).
- Commit strategy (atomic, conventional).

## Phase 4 — Gap analysis + plan review (before declaring the plan ready)
Delegate two analysis-only passes and fold their findings back in. Enforce
non-mutation with host tool policy before launch:
- host `task` → `gap-analyst` — contradictions, ambiguities, missing constraints, risks.
- host `task` → `plan-reviewer` — task granularity, file existence, testable criteria,
  concrete QA scenarios. Verdict must be APPROVE (loop on ITERATE/REJECT).

## Phase 5 — Approval gate (HARD STOP)
Present the reviewed plan, findings, recommended approach, remaining decisions,
and scope (must-have / must-NOT). **Wait for the user's explicit approval.** Never
auto-proceed from plan to implementation. Only after approval may the plan hand
off to `csw-work`.

See `references/full-workflow.md` for the detailed checklist and plan template.
