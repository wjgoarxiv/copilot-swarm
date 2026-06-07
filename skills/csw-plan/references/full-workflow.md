# csw-plan — full workflow reference

## Plan template

```
# Plan NNNN — <title>

## TL;DR
- summary, deliverables, effort, risk

## Scope
- Must-have: ...
- Must-NOT: ...

## Verification strategy
- TDD vs tests-after; manual-QA channel(s); where evidence artifacts go (.csw-qa/)

## Tasks
N. <task title>
   - do: <concrete change, concrete files>
   - do-NOT: <out of scope here>
   - references: <path:line evidence>
   - acceptance criteria + success block:
       C0NN | channel: <surface> | test: <automated test> | scenario: <observable PASS>
   - manual QA: channel, command/steps, PASS/FAIL observable, artifact path
   - commit: <conventional message>

## Final verification wave
- compliance audit · code review · real manual QA · scope fidelity

## Commit strategy
- atomic, conventional commits; one per logical change
```

## Checklist before the approval gate

- [ ] Every claim grounded in `path:line` or a pinned external citation.
- [ ] All genuine unknowns either resolved from evidence or raised in the interview.
- [ ] Scope has explicit must-have AND must-NOT.
- [ ] Every task is decision-complete (files, acceptance criteria, QA).
- [ ] Each task has a machine success block parseable by `bin/csw-runtime.mjs`.
- [ ] gap-analyst pass folded in.
- [ ] plan-reviewer verdict == APPROVE.

## Binding the plan to the goal runtime

After approval, hand the success blocks to the runtime so completion is gated:

```
node bin/csw-runtime.mjs init --objective "<goal>" --criteria-file <criteria.txt>
```

Then `csw-work` executes the plan, capturing evidence per criterion until the
completion oracle reports done.

## Interview discipline

Ask only when ALL hold: (1) you cannot resolve it from request/code/defaults,
(2) the answer materially changes the plan, (3) it is not verifiable by exploration.
Otherwise pick the sensible default and state it. Never batch trivia.
