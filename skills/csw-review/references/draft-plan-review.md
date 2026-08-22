# Draft-plan and completed-work review

Use this reference to choose the review mode, test whether a plan can be
executed atomically, and keep planning defects separate from implementation
defects. A draft plan is not reviewed as if its proposed commands already ran.

## Contents

- [Choose the review mode](#choose-the-review-mode)
- [Build the review identity](#build-the-review-identity)
- [Review a draft plan](#review-a-draft-plan)
- [Check atomic tasks](#check-atomic-tasks)
- [Review completed work](#review-completed-work)
- [Classify findings](#classify-findings)
- [Handle incomplete context](#handle-incomplete-context)
- [Stop conditions](#stop-conditions)
- [Report schemas](#report-schemas)

## Choose the review mode

Select exactly one primary mode before inspecting details.

### Draft-plan mode

Use when implementation has not started or the requested artifact is a proposed
plan. Judge whether the plan is complete, ordered, bounded, and verifiable.

Do not require implementation receipts in this mode. Require the plan to name the
future proof that will be collected. Do not execute proposed commands merely to
make the plan look complete.

Return one of:

- `PASS`: the draft is executable without material inference;
- `ITERATE`: specific plan corrections are required;
- `NEEDS-CONTEXT`: a named missing input prevents a responsible judgment.

`PASS` is approval of the plan as a plan. It is never completion approval for the
product or repository.

### Completed-work mode

Use when implementation claims to satisfy an approved plan or goal. Judge the
actual diff, current workspace, verification receipts, real-surface artifacts, and
cleanup.

Return one of:

- `UNCONDITIONAL APPROVAL`: every applicable lane is clean;
- `REJECTION`: any material finding, missing proof, stale proof, scope drift, or
  conditional approval remains.

Do not emit `PASS` for completed work. Do not emit `UNCONDITIONAL APPROVAL` for a
draft plan. The vocabulary identifies the review contract.

### Mixed input

If a packet contains both a plan and partial implementation:

1. review the plan in draft-plan mode;
2. review only claimed completed tasks in completed-work mode;
3. label unimplemented tasks `NOT YET REVIEWABLE` rather than failed;
4. reject any claim that the whole delivery is complete;
5. keep plan findings and implementation findings in separate sections.

## Build the review identity

Record the surfaces that define what is being reviewed:

```text
Mode:
User-visible goal:
Approved scope or draft revision:
Must-have set:
Must-NOT set:
Repository/worktree identity:
Diff base and head:
Criteria revisions:
Artifacts supplied:
Known concurrent work:
```

Never infer the diff base from a convenient branch name. Resolve the comparison
that matches the requested delivery boundary. A wrong base can hide required work
or manufacture unrelated findings.

For a draft plan, identify the exact document or message revision. For completed
work, identify tracked changes, non-ignored untracked files, and any nested
repository that owns part of the result.

## Review a draft plan

### Goal coverage

Build a trace table before judging prose quality:

| Goal or constraint | Owning task | Intended paths/surface | Proof named | Result |
| --- | --- | --- | --- | --- |

Flag a goal with no owner, a task with no goal, or proof that cannot establish the
promised behavior. Keep “update docs” and “run tests” attached to the behavior they
support rather than treating them as universal closing tasks.

### Boundary quality

Confirm the plan names:

- repository and nested-repository boundaries;
- files or modules likely to own the behavior;
- public API, command, config, schema, package, and migration effects;
- user changes that must be preserved;
- external writes or publication that require separate authority;
- generated, ignored, vendored, credentialed, or machine-local inputs;
- explicit out-of-scope and must-NOT items.

A broad path such as “update the backend” is not an executable boundary. Require a
discovery task when ownership is not yet known.

### Dependency order

For every task, ask what fact or artifact must exist first. Serialize only real
dependencies:

- contract before consumers;
- schema or migration strategy before data mutation;
- failing behavior proof before a risky fix when reproducible;
- implementation before package/install proof;
- packaged candidate before distribution QA;
- remediation before evidence refresh;
- evidence refresh before final review.

Independent investigation, documentation, and platform lanes may run in parallel
when their inputs and writable surfaces do not overlap.

### Verification design

Require each acceptance item to name all applicable evidence classes:

1. static structure or diagnostics;
2. focused behavior test;
3. related regression suite;
4. build, package, or install proof;
5. real user/operator channel;
6. cleanup and absence proof.

Reject “test thoroughly” because it cannot guide execution or review. Prefer a
scenario with starting state, action, expected observation, evidence surface, and
cleanup.

### Risk proportionality

Match the plan to the risk. Security, persistence, process control, network writes,
release, and migration work needs explicit failure, cancellation, recovery, and
rollback handling. A local wording change should not inherit an elaborate release
pipeline unless it changes a release surface.

## Check atomic tasks

An atomic task has one coherent outcome and one independently reviewable boundary.
Apply these checks to every proposed task.

### Ownership check

- Does the task name the module, surface, or discovery step that finds the owner?
- Does it avoid combining unrelated subsystems because they share a milestone?
- Can one worker operate without guessing another worker's unwritten decisions?

### Input check

- Are prerequisites named and already available from an earlier task?
- Is untrusted text treated as data rather than instruction?
- Are command sources repository-owned, plan-approved, or user-supplied?
- Are credentials, fixtures, and external state handled without copying secrets?

### Action check

- Does the task state the behavior to change, not only the files to edit?
- Are must-preserve and must-NOT constraints local to the task?
- Is the write boundary narrow enough for an isolated worktree?
- Does the task avoid committing, pushing, publishing, or messaging without
  explicit authority?

### Proof check

- Is there a happy-path observation?
- Is there a relevant edge or failure observation?
- Is there a regression check for preserved behavior?
- Is manual QA named when the contract is interactive or distributable?
- Is cleanup independently observable?

### Completion check

- Can the task be marked done without relying on a later task to repair it?
- Does completion produce a concrete artifact or verified behavior?
- Are follow-on dependencies explicit?
- Would a reviewer know exactly what changed if this task alone failed?

Split a task when it has multiple owners, independent failure modes, or different
proof surfaces. Do not split inseparable implementation and its focused test merely
to increase task count.

## Review completed work

Start from current state, not from the plan's predicted diff.

1. enumerate the actual diff and non-ignored untracked files;
2. map every changed path to an approved task or preservation need;
3. inspect surrounding ownership and integration points;
4. replay material commands from approved sources;
5. open real-surface artifacts and verify their identity;
6. compare implementation against current criteria revisions;
7. verify process, port, session, temporary-file, and diagnostic cleanup;
8. run the applicable review lanes;
9. synthesize one binding verdict.

An implementation may be technically sound and still fail for missing required
scope, unauthorized extra scope, stale evidence, or an unverified delivery surface.

When remediation changes a shared contract, invalidate prior consumer, integration,
package, and real-surface proof. Re-review from the earliest affected dependency.

## Classify findings

### Draft-plan findings

Use these classes:

- `MISSING`: a goal, constraint, task, proof, or cleanup responsibility is absent;
- `AMBIGUOUS`: multiple materially different implementations satisfy the wording;
- `MISORDERED`: a task consumes a decision or artifact not yet produced;
- `NON-ATOMIC`: ownership, writes, or proof cannot be reviewed independently;
- `UNSAFE`: authority, trust, secret, process, path, or rollback boundary is missing;
- `UNVERIFIABLE`: the named evidence cannot prove the claim;
- `OVER-SCOPE`: the plan includes behavior not authorized by the goal.

### Completed-work findings

Use `BLOCKER`, `MAJOR`, `MINOR`, and `NOTE` as defined by the verdict reference.
Every blocking finding states the affected criterion, current evidence, expected
state, impact, correction, and required replay.

Do not use severity to soften a binary completion gate. An explicit acceptance item
can make a narrow defect blocking even when its engineering impact is small.

## Handle incomplete context

Return `NEEDS-CONTEXT` in draft-plan mode only when the missing information changes
the plan materially and cannot be discovered from the provided repository or
artifacts. Name the smallest missing input and why it matters.

Examples:

- the user has not selected between incompatible public contracts;
- the actual repository owning the work is unavailable;
- an external policy controls mandatory behavior but its text was not supplied;
- the required delivery channel is unknown and changes verification design.

Do not request context for facts that a read-only repository inspection can resolve.
Do not guess authority for deployment, publication, external messaging, data
mutation, or history rewriting.

In completed-work mode, missing required review material is `REJECTION`, not
`NEEDS-CONTEXT`, because the completion claim is not currently provable.

## Stop conditions

Stop a draft-plan review and return `ITERATE` when:

- a must-have has no task owner;
- a must-NOT is contradicted;
- command or external-effect authority is unsafe;
- tasks cannot be ordered without a missing architectural decision;
- completion proof is only prose or worker assertion;
- the plan requests weakening or bypassing the evidence gate.

Stop a completed-work review and return `REJECTION` immediately for exposed secrets,
unauthorized destructive/external action, an uncontrolled command boundary, or a
wrong repository/diff identity. Continue collecting other findings only when doing
so is safe and useful for a complete remediation packet.

## Report schemas

### Draft-plan report

```text
Mode: DRAFT PLAN
Plan revision and scope:
Goal coverage result:
Atomic-task result:
Ordering result:
Verification-design result:
Authority and trust result:
Findings by ID and class:
Missing context, if any:
Verdict: PASS | ITERATE | NEEDS-CONTEXT
Exact next plan edit:
```

### Completed-work report

```text
Mode: COMPLETED WORK
Workspace and diff identity:
Approved plan and criteria revisions:
Lanes completed:
Commands and artifacts replayed:
Findings by ID and severity:
Unverified claims:
Cleanup result:
Verdict: UNCONDITIONAL APPROVAL | REJECTION
Exact next action:
```

Never merge the two verdict vocabularies. The reader should know from the verdict
alone whether the artifact under review was a plan or a claimed completed delivery.
