---
name: csw-review
description: Run a binding, all-or-nothing review for broad, risky, shared, security-sensitive, or release-facing work across compliance, code quality, real manual QA, evidence integrity, security, and scope fidelity.
---

# csw-review — all-or-nothing review gate

Use this skill before declaring risky or broad work complete. Review lanes may run
independently through native scheduling, but the conductor owns the final verdict:
worker conclusions are claims until their diffs, commands, and artifacts are
re-inspected.

Read the focused references:

- [Compliance lanes](references/compliance-lanes.md) — goal, plan, code quality,
  manual QA, compatibility, and operational checks.
- [Evidence review](references/evidence-review.md) — receipt freshness, artifact
  identity, command provenance, real-surface interpretation, and cleanup.
- [Security and scope](references/security-and-scope.md) — authority, trust, data,
  prompt injection, worktree isolation, and must-NOT boundaries.
- [Verdict template](references/verdict-template.md) — finding format, severity,
  re-review loop, and `UNCONDITIONAL APPROVAL` gate.
- [Draft-plan and completed-work review](references/draft-plan-review.md) — mode
  gates, atomic task checks, plan verdicts, and completed-delivery review.
- [Review worker packets](references/review-worker-packets.md) — self-contained
  read-only lane packets, native `/tasks` interpretation, and conductor synthesis.
- [Manual QA and context mining](references/manual-qa-and-context-mining.md) — diff
  reconstruction plus CLI, HTTP, web, TUI, package, and artifact scenarios.

## Review preconditions

Do not begin a completion review without:

1. user-visible goal and current approved scope;
2. success criteria and their revisions;
3. complete diff including non-ignored untracked paths;
4. test, build, package, or install commands from owned sources;
5. real manual QA artifact index;
6. known limitations, blockers, and cleanup receipt;
7. plan or decision record for non-trivial work.

If a required input is absent, return `REJECTION` with the missing review input.

## Worker isolation and scheduling

Independent lanes may use native `task` workers. Use `/fleet` only when the user
wants visible parallelism and `/tasks` for inspection or cancellation.

Review workers are read-only. Enforce that through the host deny/available-tool
policy; “do not edit” prose is not a security boundary. Every worker packet is
self-contained and names goal, scope, diff, criteria, evidence, lane questions, and
required verdict.

Do not give a reviewer authority to fix findings in place. Review and remediation
are separate phases.

## Lane F1: compliance and plan fidelity

Check:

- every approved must-have maps to implementation and evidence;
- every must-NOT remains absent;
- ordered tasks and acceptance scenarios were completed;
- criteria match the current goal rather than an earlier revision;
- required docs, migration, compatibility, and cleanup work is present;
- no task was marked complete solely from prose or a worker claim.

Missing required work is rejection even when existing tests pass.

## Lane F2: code quality and maintainability

Inspect the actual diff and surrounding code:

- behavior matches local architecture and conventions;
- tests fail for the intended pre-change reason and prove useful contracts;
- no dead branches, broad catches, duplicate logic, needless wrappers, or generated
  churn entered the change;
- types, error handling, resource ownership, and boundaries are explicit;
- comments explain non-obvious intent rather than narrating syntax;
- diagnostics, lint, format, build, focused tests, and full relevant tests pass;
- public changes have compatibility coverage.

Re-run material commands yourself. A pasted output excerpt is not enough.

## Lane F3: real manual QA

For each success criterion, inspect the actual user/operator channel:

- CLI output and exit status;
- HTTP request, status, headers, body, and side effects;
- browser interaction, viewport/state captures, keyboard, and accessibility;
- terminal dimensions, resize, scrolling, color-off, and CJK where relevant;
- installed package or plugin discovery from the packaged candidate;
- generated artifact identity and content.

Confirm fixture, build identity, scenario steps, expected result, evidence path, and
cleanup. A unit suite cannot substitute for channel evidence.

## Lane F4: evidence integrity

Audit every machine receipt:

- command proof uses the exact runtime invocation injected at session start with
  `verify --id <C0NN> -- <approved argv...>`;
- real-surface files use that invocation with
  `artifact --id <C0NN> --path <file> --summary "<result>"`;

- correct criterion and current revision;
- successful exit or current artifact identity;
- workspace freshness when available;
- ignored inputs bound separately;
- command argv sourced from approved repository or plan surfaces;
- no raw secret or source body persisted;
- artifact is nonempty, current, and actually supports the summarized claim;
- no stale evidence after later edits.

Receipts do not authenticate against a malicious same-user editor. Review the real
workspace, command source, and artifact rather than treating state JSON as a trust
oracle.

## Lane F5: security and authority

Review in proportion to risk:

- user authority for writes, external messages, deployment, publication, or data
  changes;
- validation and handling of untrusted input;
- secret exposure in config, logs, artifacts, commands, and test fixtures;
- permission, path, symlink, injection, process, and network boundaries;
- trusted-command provenance for runtime verification;
- bounded timeout, cancellation, teardown, and partial-failure behavior;
- dependency or generated artifact changes;
- host-enforced worker restrictions and isolated worktrees.

Security uncertainty on a material boundary is rejection, not an optional note.

## Lane F6: scope fidelity and integration

Compare request, approved plan, and final diff:

- no opportunistic feature, refactor, format sweep, dependency change, or public
  contract beyond must-have;
- no required behavior quietly deferred;
- unrelated user changes remain preserved;
- nested repositories and generated outputs are handled deliberately;
- cross-task integrations and imports are complete;
- docs and release surfaces describe current behavior without overclaiming.

An individually reasonable change can still fail because it was not authorized.

## Evidence replay order

Review in dependency order:

1. current workspace and diff;
2. criterion revision and scope;
3. command provenance;
4. focused checks;
5. full relevant regression;
6. package/install/release surfaces;
7. real manual QA artifacts;
8. cleanup and process absence;
9. completion-oracle state.

If any source changes during remediation, invalidate and replay affected later steps.

## Finding format

Every blocking finding includes:

```text
ID and severity:
Lane:
Criterion or scope item:
Path/evidence:
Observed:
Expected:
User or system impact:
Required correction:
Required re-verification:
```

Use `BLOCKER`, `MAJOR`, `MINOR`, or `NOTE`. A minor can still block when the approved
completion bar explicitly requires it.

## Overall verdict

- Any lane with a blocker, unresolved material gap, missing proof, hedge, or
  conditional approval makes the overall verdict `REJECTION`.
- `APPROVE IF`, `looks good but`, and “follow up later” are rejection.
- Only all lanes clean yields `UNCONDITIONAL APPROVAL`.

Record unresolved findings as runtime blockers when a goal is active. Free-text evidence cannot
pass a criterion.

## Remediation loop

For rejection:

1. preserve all findings;
2. route fixes through the approved plan and `csw-work`;
3. rerun focused tests and affected real surfaces;
4. refresh receipts and cleanup;
5. re-run every affected lane, plus integration lanes when shared surfaces changed;
6. synthesize a new complete verdict.

Reviewers do not lower severity merely because remediation is inconvenient.

## Binding outcome

`UNCONDITIONAL APPROVAL` is the human-facing quality gate, not a replacement for the
goal runtime. Final completion still requires every current criterion to have valid
machine evidence, zero open blockers, and the injected runtime invocation's `complete` to succeed.

The review report names reviewed commit/worktree state, lanes, findings, commands,
artifact index, cleanup, verdict, and the exact next action.
