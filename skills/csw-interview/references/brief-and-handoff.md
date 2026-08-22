# Brief and handoff

## Decision-complete brief template

```markdown
# Brief: <outcome>

## Problem and users
- Current problem, affected users, context, and consequence.

## Desired outcome
- Observable end state independent of implementation.

## Goals
- Must-have outcomes.

## Non-goals
- Explicit adjacent capabilities excluded.

## Verified facts
- Repository/runtime facts with paths or commands.

## Behavior
### Happy path
### Boundary and malformed input
### Failure and recovery
### State transitions and idempotence

## Constraints and quality attributes
- Performance, security, privacy, accessibility, operability, cost.

## Compatibility and migration
- Supported consumers/data/versions, transition, rollback.

## Security and authority
- Trust boundaries, credentials, external mutations, approval owners.

## Chosen tradeoffs
- Decision, rejected alternative, reason.

## Decision boundaries
- User-owned, repository-owned, implementer-owned, external-owner.

## Acceptance scenarios
| ID | Channel | Given | When | Then | Evidence |
| --- | --- | --- | --- | --- | --- |

## Remaining risks or unknowns
- Explicitly unresolved items only.
```

## Acceptance quality

Each scenario names a real channel: CLI, HTTP, browser, TUI, package consumer, hook payload, or file
artifact. Include happy, edge/failure, and regression. “Tests pass” is not a scenario without the
observable contract and command.

## Decision log

| Decision | Owner | Evidence/answer | Alternative rejected | Consequence |
| --- | --- | --- | --- | --- |
| | | | | |

## Handoff readiness

The recipient should not need to invent:

- product scope or non-goals;
- public behavior or error policy;
- migration and compatibility;
- security authority;
- quality budgets;
- acceptance evidence;
- which implementation details are delegated.

Technical exploration may still be necessary, but product decisions must be explicit.

## Defaults

Name reasonable implementer defaults and the boundary where they stop. Example: internal function
names follow repository convention, but changing the public command name remains user-owned.

## Early-exit warning

When ambiguity remains above target, add:

```text
This handoff is not decision-complete.
Unresolved choices:
Assumed defaults:
Risk if assumptions are wrong:
Next required decision:
```

## Handoff verification

- [ ] Goals and non-goals do not conflict.
- [ ] Verified facts are separated from inference.
- [ ] Happy, edge, failure, and regression behavior exists.
- [ ] Compatibility and migration decided.
- [ ] Security and authority explicit.
- [ ] Tradeoffs record rejected alternatives.
- [ ] Acceptance scenarios are observable.
- [ ] Decision owners named.
- [ ] Remaining risks honest.

## Recommended next route

- Decision-complete but multi-step: planning.
- Small and concrete: implementation with tests.
- Feasibility unknown: read-only technical spike.
- External owner/credential required: blocked handoff with one unblocker.

## Scenario table

Translate acceptance into observable scenarios before handoff:

| Class | Starting state | Action | Observable result | Proof surface |
| --- | --- | --- | --- | --- |
| happy | valid ordinary input | primary action | intended outcome | test/UI/artifact |
| edge | boundary-sized or unusual input | same action | bounded correct behavior | focused scenario |
| failure | invalid input or dependency failure | attempted action | actionable safe recovery | error scenario |
| regression | existing supported behavior | unchanged path | no material change | existing suite/capture |
| compatibility | old config/data/client | migration or reuse | declared supported result | migration probe |

Avoid acceptance statements such as “works well” or “handles errors.” Name inputs, outputs, and
evidence another operator can reproduce.

## Decision log

Preserve material choices in a compact table:

| Decision | Options considered | Chosen option | Why | Rejected cost | Owner |
| --- | --- | --- | --- | --- | --- |

Include only choices that change scope, public behavior, compatibility, security, operations, or
verification. Minor implementer decisions can remain with repository convention.

## Assumption expiry

Every consequential assumption needs an expiry condition:

```text
Assumption:
Evidence available now:
Why progress is safe:
Condition that invalidates it:
Action if invalidated:
Decision owner:
```

Do not convert a missing user choice into a permanent product decision. If invalidation would cause
material rework or external impact, keep the item unresolved instead of assuming.

## Cross-role handoff checks

Before routing the brief:

- an implementer can locate the owning modules and boundaries;
- a tester can derive happy, edge, failure, and regression scenarios;
- a reviewer can distinguish required behavior from optional polish;
- an operator can identify configuration, migration, rollback, and observability needs;
- a security reviewer can see authority, data, trust, and abuse boundaries;
- the user can see which decisions remain theirs.

If any role must infer a material requirement, the brief is not decision-complete.

## Change-control section

For work likely to evolve during implementation, state:

```text
In-scope clarifications implementers may decide:
Changes requiring user approval:
Changes requiring compatibility review:
Changes requiring security or operational review:
How accepted changes update criteria and tests:
```

This prevents implementation discoveries from silently broadening the mission or weakening its
completion evidence.

## Resume packet

When work pauses, append current status without rewriting verified decisions:

```text
Last completed scenario:
Current artifact or branch:
Exact blocker:
Evidence already collected:
Unverified claims:
Next safe action:
Authority needed:
Cleanup state:
```

The resume packet should let a new operator continue without repeating the interview or mistaking
an assumption for an approved choice.
