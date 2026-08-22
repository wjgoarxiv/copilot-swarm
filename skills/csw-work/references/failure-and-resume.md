# Failure, rollback, and resume

Failures are durable state, not reasons to improvise around the plan. Preserve the
first useful observation, classify it, clean up, and resume from the earliest phase
whose proof became invalid.

## Failure taxonomy

| Class | Example | Immediate action |
| --- | --- | --- |
| expected RED | new test proves missing behavior | continue to GREEN |
| implementation defect | focused scenario still fails | keep criterion pending, diagnose |
| test/fixture defect | failure unrelated to promised behavior | repair test, reproduce valid RED |
| integration conflict | worker or adjacent diff overlaps | resolve from intent, rerun both scopes |
| environment unavailable | tool/service/credential missing | record blocker and prerequisite |
| authority missing | needs push/deploy/message/destructive action | stop and request authority |
| timeout/cancel | command or task did not terminate cleanly | inspect process tree and cleanup |
| stale plan | repository or scope changed materially | return to planning and approval |
| stale receipt | source/criterion/artifact changed | replay affected proof |
| cleanup failure | process/path/session remains | do not pass; remove and verify |

## Failure capture

```text
Task and criterion:
Phase:
Command/action:
Expected:
Observed and exit/status:
First failing transition:
Workspace identity:
Artifacts/log excerpt:
Resources created:
Cleanup result:
Classification:
Next safe action:
```

Keep excerpts short and sanitized. Never persist credentials, source bodies, or full
environment dumps.

## Diagnostic order

1. reproduce with the smallest owned command or scenario;
2. separate product, test, fixture, environment, and integration hypotheses;
3. inspect the nearest boundary and recent diff;
4. test one discriminating hypothesis at a time;
5. update the test or code only after identifying ownership;
6. replay dependent verification and surface evidence;
7. clean up every probe.

Do not enlarge timeouts, add retries, or skip tests before establishing why the
operation failed.

## Blocked handoff

Use a runtime blocker when progress requires external state or authority:

```text
Blocked criterion:
Exact prerequisite or authority:
Why it is outside current control:
Evidence and attempts ruled out:
Safe work already completed:
State/artifact locations:
Cleanup confirmed:
Resume action after unblock:
```

Marking a blocker resolved does not make it true. Verify that the missing condition
changed and repeat the invalidated phase.

## Rollback decision

Rollback when the approved trigger occurs and reversal is safer than continuing.
Before action:

- identify the last safe state;
- separate task changes from unrelated user work;
- identify code, config, data, process, and external effects;
- choose the narrowest approved reversal or compensation;
- preserve failure evidence;
- name the decision owner for external or destructive effects.

Never use destructive worktree commands to erase unknown local changes.

## Rollback packet

```text
Trigger:
Decision owner:
Last safe identity:
Changes to reverse:
User changes to preserve:
Data/external effects:
Procedure from approved source:
Post-rollback tests:
Real-surface verification:
Cleanup verification:
Forward-fix alternative:
```

If an effect is irreversible, stop with a blocked recovery plan rather than claiming
rollback succeeded.

## Conflict recovery

For worktree or integration conflicts:

1. preserve both diffs and base identity;
2. state each side's intent and acceptance criteria;
3. resolve the smallest owning paths;
4. inspect the staged or integrated diff;
5. rerun focused tests for both sides;
6. rerun shared integration and manual QA;
7. refresh stale receipts;
8. remove the isolated worktree only after integration proof.

Absence of conflict markers is not behavioral proof.

## Timeout and cancellation recovery

Timeout/cancel process-tree cleanup is best-effort. After a timeout:

- inspect the parent and observed children;
- stop remaining approved processes;
- confirm ports, sessions, containers, and writers are absent;
- remove partial temporary output only within the owned boundary;
- verify state files remain valid;
- record a cleanup receipt;
- retry only after identifying whether the timeout was expected, environmental, or
  a product defect.

Daemonized commands may outlive the runner; avoid them in verification.

## Stale evidence recovery

A source change, criterion revision, artifact mutation, package rebuild, ignored
input change, or changed dependency may stale proof.

Resume from the earliest affected step:

```text
PIN change only -> re-PIN and downstream
test change -> reproduce RED/GREEN and downstream
implementation change -> focused verification and downstream
package change -> rebuild/install and surface proof
criterion revision -> rebind/replay entire criterion
artifact mutation -> reproduce surface and receipt
cleanup-only change -> cleanup and dependent verdict
```

Do not edit receipt metadata to appear fresh.

## Resume packet

```text
Approved plan/revision:
Goal and active criterion:
Last completed checkpoint:
Current repository/diff identity:
Passing evidence still current:
Stale or missing evidence:
Open blockers:
Processes/resources state:
Exact next safe action:
Commands from owned sources:
Authority boundaries:
```

The next operator should not need chat history to distinguish facts, assumptions,
and unverified claims.

## Safe-mode and malformed state

Missing, malformed, empty, stale, completed, or safe-mode runtime state may fail
open to avoid trapping Copilot CLI. Treat that as an enforcement state only.

Before resuming:

1. inspect the durable plan and ledger;
2. validate or reinitialize state through supported commands;
3. recover criteria without hand-editing receipts;
4. replay current proof;
5. confirm the root continuation behavior and no subagent-stop coupling.

Fail-open never means the work is complete.

## Abandonment

Clear a goal only when the user explicitly abandons it or replaces it with a
different authorized objective. Before `clear`:

- preserve a final ledger entry and artifact index;
- stop and clean all resources;
- state which criteria remain unmet;
- preserve unrelated work;
- explain whether partial changes remain and how to revert them safely.

Do not clear state merely to escape a completion gate.
