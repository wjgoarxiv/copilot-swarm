# Compliance and quality lanes

Use these lane checklists to review the whole delivery. Combine lanes only when the
review remains independent and no question is lost.

## F1 Goal and plan compliance

- [ ] user-visible goal matches current implementation;
- [ ] approved plan revision is identified;
- [ ] every must-have has a concrete diff and proof;
- [ ] every must-NOT remains absent;
- [ ] deferred work is truly outside acceptance;
- [ ] each ordered task is complete or explicitly superseded;
- [ ] success criteria use current revisions;
- [ ] blockers are resolved in fact, not merely marked resolved;
- [ ] commit or delivery boundary matches authorization.

Create a trace table:

| Scope item | Owning task | Changed paths | Criterion | Evidence | Result |
| --- | --- | --- | --- | --- | --- |

An empty cell is a finding unless the plan explicitly explains why the item needs no
implementation or separate evidence.

## F2 Code quality

Inspect changed code and enough surrounding architecture to judge fit:

- responsibilities stay with the owning module;
- public contracts are explicit and backward-compatible as promised;
- error handling preserves actionable context without leaking secrets;
- state and resource lifetime are deterministic;
- no duplicate implementation or hidden alternate path remains;
- complex logic has behavior tests, not only snapshots;
- boundary conditions and malformed input are covered;
- comments explain intent or constraints;
- names match domain language;
- no unused code, imports, fixtures, flags, or dependencies remain.

Check the final diff rather than only the changed files individually. Integration
errors often occur at imports, exports, manifests, and configuration boundaries.

## F3 Test quality

For each test added or changed:

- prove it failed for the intended reason before implementation when possible;
- verify it asserts user-visible behavior or a stable contract;
- ensure the fixture is representative and deterministic;
- confirm it would fail if the implementation regressed;
- reject broad skips, flaky retries, weakened assertions, and over-mocked behavior;
- verify cleanup and isolation;
- keep malformed and regression cases distinct from happy behavior.

Snapshots are acceptable only when the snapshot itself is a meaningful contract and
reviewed for accidental churn.

## F4 Automated verification

Re-run commands from repository-owned sources:

```text
Focused test:
Related suite:
Type or static analysis:
Lint/format:
Build:
Full regression:
Package/install/release check:
```

Record command, exit status, and current workspace identity. If a command is not
available, state which equivalent owned check was used or reject the missing proof.

## F5 Real manual QA

Map every criterion to its promised channel:

| Criterion | Channel | Starting state | Action | Expected | Artifact | Cleanup |
| --- | --- | --- | --- | --- | --- | --- |

Open the artifact. Verify it belongs to the current build and scenario. For an
interactive flow, confirm the sequence, not only the final frame.

Inspect relevant edge states: empty, boundary, malformed, unavailable dependency,
permission denial, timeout, cancellation, long content, narrow dimensions, or
partial failure.

## F6 Compatibility and migration

When the delivery touches public APIs, commands, config, schemas, persisted data, or
package surfaces, verify:

- old supported input and state behavior;
- new behavior and defaults;
- migration or conversion path;
- malformed or partial migration recovery;
- rollback or forward-fix plan;
- consumer-facing documentation;
- version and release surfaces;
- no source-tree-only success masquerades as packaged success.

Use a clean packaged or installed candidate for distribution claims.

## F7 Operations and cleanup

- [ ] timeouts and retries are bounded;
- [ ] failures produce actionable status;
- [ ] logs avoid secrets and source bodies;
- [ ] spawned processes and children terminate;
- [ ] ports, containers, sessions, contexts, and temporary directories are absent;
- [ ] diagnostic edits are restored;
- [ ] artifact retention is intentional;
- [ ] rollback verification is executable from owned sources.

Cleanup failure blocks the lane even when behavior passed.

## Lane verdict form

```text
Lane:
Scope reviewed:
Commands replayed:
Artifacts inspected:
Findings by severity:
Unverified claim:
Verdict: APPROVE | REJECTION
Required re-review after fixes:
```

A lane cannot approve with a material unverified claim.
