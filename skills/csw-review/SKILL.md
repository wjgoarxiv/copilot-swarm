---
name: csw-review
description: Use to run a rigorous multi-lane review before declaring work done — for any broad, risky, shared, security-sensitive, or release-facing change. Uses native scheduling for independent review lanes and gates on ALL of them passing with a single binding verdict.
---

# csw-review — all-or-nothing review gate

Run independent review lanes in parallel and accept the work only if EVERY lane
passes. One failing lane = overall REJECTION.

## Lanes (independent; parallel when useful)

Use native `task` subagents to run these as independent workers, routing each to the
`verifier` agent with a lane-specific brief. Use `/fleet` for user-visible parallel
execution and `/tasks` to inspect or cancel work. Enforce non-mutation with host
deny/available-tool policy before launch; a review prompt is not a security boundary.

- **F1 Compliance** — every planned task done? every acceptance criterion met?
  plan/output format honored?
- **F2 Code quality** — diagnostics clean; idioms match the repo; no dead code; no
  avoidable risk; no AI-slop.
- **F3 Real manual QA** — every QA scenario actually executed through its channel;
  evidence artifacts present; cleanup receipts recorded.
- **F4 Scope fidelity** — nothing shipped beyond Must-have; nothing Must-NOT
  introduced.

Each lane's worker prompt must be self-contained: include the goal, the diff (or
how to obtain it), the success criteria, and the evidence locations.

## Distrust and re-verify

Worker verdicts are claims. Before accepting an APPROVE, spot-check it yourself:
re-read the diff, re-run the cited tests, open the cited evidence artifacts.
Replay command-backed criteria with `csw-runtime verify --id <C0NN> -- <argv...>`;
bind file-backed real-surface evidence with `csw-runtime artifact --id <C0NN>
--path <workspace-file> --summary "<observed outcome>"`. Free-text evidence cannot
pass a criterion.

## All-or-nothing gate

Combine the lanes:
- If any lane returns REJECTION (or hedges — "looks good but…", "approve if…"),
  the overall verdict is **REJECTION**. List every blocking finding and loop:
  fix → re-run the affected lane(s) → re-gate.
- Only when all four lanes return clean APPROVE is the verdict
  **UNCONDITIONAL APPROVAL**.

## Binding outcome

Record the result. If a goal runtime is active, completion still requires
`csw-runtime complete` to pass (criteria + machine receipts + zero blockers) — this review
is the human-facing quality gate layered on top of the oracle, not a replacement
for it. Unresolved review findings should be filed as blockers
(`csw-runtime blocker add`) so they block completion until addressed.
