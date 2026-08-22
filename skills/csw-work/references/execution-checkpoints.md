# Execution checkpoints

Use these packets to make approved-plan execution resumable and independently
verifiable.

## Startup checkpoint

```text
Approved plan path/revision:
Approval evidence:
Goal state and criterion revisions:
Repository head and dirty paths:
Governing instructions:
Must-have / must-NOT:
Authority boundary:
Current task:
Known blockers:
```

If repository structure, public contracts, or user scope changed since approval,
pause and return to planning.

## Per-task PIN packet

```text
Task and criterion IDs:
Expected user/operator result:
Dependencies already proven:
In-scope paths:
Protected paths and behaviors:
Expected RED or baseline:
Owned verification commands:
Real manual QA channel:
Evidence path:
Review lane requirement:
Rollback trigger:
Cleanup resources:
```

Do not begin if a predecessor criterion is stale or the task needs an unapproved
decision.

## RED checkpoint

Record:

- test path and name;
- pre-change command and exit status;
- concise expected failure;
- why the failure proves the missing behavior;
- fixture and cleanup result;
- unrelated failures observed separately.

For characterization, record the current behavior and why it is intentionally
preserved. For structural/document/package changes, record the missing path, link,
discovery, render, or packed-surface assertion.

## GREEN checkpoint

Before widening verification:

- [ ] focused test passes from a fresh process;
- [ ] complete diff inspected;
- [ ] no unapproved path or generated churn;
- [ ] no skipped test, broad ignore, retry inflation, or weakened assertion;
- [ ] unrelated user work preserved;
- [ ] new files are reachable from the intended package or manifest;
- [ ] temporary diagnostic changes restored.

Green is a local milestone, not criterion completion.

## Verification checkpoint

| Layer | Owned command | Result | Workspace identity | Notes |
| --- | --- | --- | --- | --- |
| syntax/config parse |  |  |  |  |
| focused test |  |  |  |  |
| related suite |  |  |  |  |
| type/static analysis |  |  |  |  |
| lint/format |  |  |  |  |
| build |  |  |  |  |
| full regression |  |  |  |  |
| package/install/release |  |  |  |  |

Run commands from repository-owned sources or the approved plan. Do not wrap
untrusted argv in a shell.

## Real-surface checkpoint

```text
Criterion and channel:
Build/package identity:
Starting state and fixture:
Actions:
Expected result:
Observed result and status:
Edge/failure behavior:
Artifact path:
Sensitive data handling:
```

For UI/TUI include dimensions, focus, and state transitions. For CLI/HTTP include
stdout/stderr or status/body boundaries. For install claims, run from the packed and
installed candidate rather than repository source resolution.

## Receipt checkpoint

Choose one:

```text
<exact runtime invocation injected at session start> verify --id C001 -- <approved deterministic argv>
<exact runtime invocation injected at session start> artifact --id C002 --path <nonempty workspace file> --summary "<observed result>"
```

Review:

- criterion revision current;
- git freshness available or non-git limitation recorded;
- ignored inputs bound separately;
- artifact identity and digest current;
- command did not come from worker/fetched/untrusted text;
- timeout, signal, and output-limit state successful;
- cleanup independently verified.

Receipts do not authenticate against a malicious same-user editor.

## Worker integration checkpoint

For every writing worktree:

```text
Worker packet and task:
Base/worktree/branch identity:
Actual changed and untracked paths:
Diff reviewed by conductor:
Conflict resolution and intent:
Focused tests rerun:
Full/integration tests rerun:
Imported commit or patch identity:
Worktree cleanup state:
```

Do not integrate a worker self-report. For read-only workers, record host policy and
re-open cited paths or sources.

## Review checkpoint

Provide goal, plan, criteria, diff, commands, artifacts, known limitations, and
cleanup. Record lane findings and consolidated verdict.

Any `REJECTION`, hedge, missing input, or “approve if” returns the task to the
earliest affected phase. Only `UNCONDITIONAL APPROVAL` satisfies the human-facing
review gate.

## Cleanup checkpoint

| Resource | Created by | Teardown | Independent proof | Result |
| --- | --- | --- | --- | --- |
| process/child |  |  | process absent |  |
| port/server |  |  | port closed |  |
| terminal session |  |  | list absent |  |
| browser context |  |  | context closed |  |
| container |  |  | list absent |  |
| temp path |  |  | path absent |  |
| diagnostic edit |  |  | diff clean of probe |  |
| recorder |  |  | process absent/artifact final |  |

Timeout cleanup is best-effort. A cleanup receipt records the observed absence, not
an assumption that the stop command worked.

## Atomic task completion

```text
Task result:
Criteria passed:
Commands and receipts:
Real-surface artifacts:
Review verdict:
Cleanup receipt:
Changed paths:
Commit, if authorized:
Remaining tasks/dependencies:
Open blockers:
Next checkpoint:
```

Checkpoint even a failed or blocked outcome so the next operator does not repeat
unsafe or expensive work.

## Final integration checkpoint

- [ ] approved scope trace complete;
- [ ] all current criterion revisions have valid receipts;
- [ ] final diff and untracked surface reviewed;
- [ ] full regression green;
- [ ] packaged/installed surface verified where relevant;
- [ ] real manual QA artifacts current and opened;
- [ ] review unconditional;
- [ ] ignored inputs bound;
- [ ] zero runtime blockers;
- [ ] cleanup matrix clear;
- [ ] completion oracle succeeds.
