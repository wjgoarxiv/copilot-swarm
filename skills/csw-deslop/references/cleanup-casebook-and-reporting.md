# Cleanup casebook and reporting

Use these cases to compare evidence and decision shape. They are not copy-paste prescriptions.
Repository contracts, local conventions, and observed behavior decide the result.

## Contents

- [Case 1: narrated syntax](#case-1-narrated-syntax)
- [Case 2: runtime guard beside static types](#case-2-runtime-guard-beside-static-types)
- [Case 3: one-call wrapper](#case-3-one-call-wrapper)
- [Case 4: broad boundary catch](#case-4-broad-boundary-catch)
- [Case 5: repeated lookup in a loop](#case-5-repeated-lookup-in-a-loop)
- [Case 6: lazy pipeline materialization](#case-6-lazy-pipeline-materialization)
- [Case 7: generic helper bucket](#case-7-generic-helper-bucket)
- [Case 8: clone or copy removal](#case-8-clone-or-copy-removal)
- [Case 9: mocked call-order test](#case-9-mocked-call-order-test)
- [Case 10: compatibility alias](#case-10-compatibility-alias)
- [Case 11: unbounded parallel shorthand](#case-11-unbounded-parallel-shorthand)
- [Case 12: generated-looking security check](#case-12-generated-looking-security-check)
- [Review packet](#review-packet)
- [Cleanup report](#cleanup-report)

## Case 1: narrated syntax

**Observation:** A comment says “increment the retry count” directly above an increment.

**Decision:** Remove it if no policy or rationale is lost. Preserve or rewrite the comment if it
explains why this attempt is counted before a call, how it aligns with telemetry, or which external
limit applies.

**Proof:** Run formatter/lint and the focused retry test; inspect the diff for adjacent rationale.

## Case 2: runtime guard beside static types

**Observation:** TypeScript checks that a field is a string although its internal type is string.

**Decision:** Trace origin. Remove a duplicated internal guard only when all callers are typed and
validated. Preserve it when data enters through JSON, storage, IPC, plugins, environment, or an
older consumer.

**Proof:** Exercise valid, missing, and malformed boundary inputs through the real parser.

## Case 3: one-call wrapper

**Observation:** A helper calls a client method and returns its result unchanged.

**Decision:** Inline only if it owns no timeout, normalization, error translation, lifecycle,
instrumentation, policy, test seam, or public import. Preserve it when it marks an owned boundary.

**Proof:** Map callers, package exports, success and dependency failure, then inspect dependency
direction after the proposed inline.

## Case 4: broad boundary catch

**Observation:** A top-level worker catches every error, logs a redacted summary, sets failure
status, and closes partially opened resources.

**Decision:** Preserve the boundary catch. Improve internal typed handling separately if needed.
Deleting it because broad catches are usually suspicious would remove cleanup and process policy.

**Proof:** Inject a dependency failure and confirm error visibility, redaction, exit/status, and
resource cleanup.

## Case 5: repeated lookup in a loop

**Observation:** Each item requests the same immutable metadata.

**Decision:** Consider hoisting only after proving the metadata is invariant per operation, does
not depend on item authorization, and can safely remain alive for the loop duration. If freshness
is per item, preserve the lookup.

**Proof:** Count lookups for representative input; test a skipped loop, failure before first item,
and configuration change behavior.

## Case 6: lazy pipeline materialization

**Observation:** A generator is replaced with a list to simplify downstream code.

**Decision:** Treat as behavior-sensitive. Preserve laziness when callers stop early, data can be
large, errors occur during iteration, or resources close with consumption. Materialize only when
bounded ownership and timing are explicitly accepted.

**Proof:** Observe first-item timing, partial consumption cleanup, exception timing, and peak item
retention.

## Case 7: generic helper bucket

**Observation:** A shared module mixes date formatting, authorization predicates, query builders,
and UI labels.

**Decision:** Map consumers and move one cohesive concept to its owner. Do not perform a repository-
wide reshuffle or rename the bucket without changing ownership.

**Proof:** Draw import edges before and after, run focused consumers, build, and check for cycles or
new public exports.

## Case 8: clone or copy removal

**Observation:** A Rust clone, Go slice copy, or JavaScript object copy appears redundant.

**Decision:** Verify ownership, aliasing, mutation, lock duration, async boundaries, and caller
expectations. Remove only when the original and copy cannot diverge observably.

**Proof:** Test later mutation and concurrency where relevant; run the repository's static and
runtime checks.

## Case 9: mocked call-order test

**Observation:** A test asserts five private calls in an exact sequence although only final output
is public.

**Decision:** Replace with observable success, error, ordering, and cleanup assertions when call
order is not the contract. Preserve order assertions for protocols, transactions, locks, or
lifecycle sequences where order is observable.

**Proof:** Demonstrate that an internal refactor can pass the behavior test while a contract change
still fails it.

## Case 10: compatibility alias

**Observation:** An old export forwards to a renamed implementation and has no in-repository caller.

**Decision:** Search package exports, documentation, release policy, downstream tests, dynamic
loading, and supported versions. Preserve it when external consumers may rely on it; remove only
under the repository's compatibility policy.

**Proof:** Test both supported import paths or record explicit removal authorization and migration.

## Case 11: unbounded parallel shorthand

**Observation:** A sequential loop is replaced with one expression that starts every operation.

**Decision:** Reject as mechanical cleanup unless concurrency, limit, ordering, cancellation,
partial failure, and external capacity are explicitly designed. Shorter code is not equivalent.

**Proof:** Exercise a boundary-sized input, one failure, cancellation, and the maximum observed
in-flight count.

## Case 12: generated-looking security check

**Observation:** Repeated validation or an explanatory comment resembles generated boilerplate.

**Decision:** Identify trust boundaries. Keep authorization, path containment, secret redaction,
payload limits, and fail-closed checks at the boundary even if they look repetitive. Consolidate
only if the new owner is unavoidable on every path.

**Proof:** Run malformed and unauthorized cases and confirm denial, observability, and no side
effect. Review the diff specifically for weakened defaults.

## Review packet

Provide a reviewer the raw evidence needed to disagree:

```text
Requested scope and explicit exclusions:
Repository instructions and toolchain:
Baseline worktree/diff state:
Behavior contracts and characterization tests:
Finding list by category, path, and symbol:
Preserve list and reasons:
Changed files and full diff:
Focused, adjacent, and full relevant commands:
Static/build/package results:
Real user scenario and observed output:
Created artifacts/processes and cleanup:
Known failures or unavailable evidence:
```

Do not replace paths, commands, exits, and observations with “tests pass.” The reviewer must read
the diff and be able to rerun repository-owned validation.

## Cleanup report

```text
Scope cleaned:
Excluded dirty/generated/vendor paths:
Baseline result:
Smells removed by category:
Structural decisions and ownership map:
Safeguards, compatibility, and rationale preserved:
Behavior-equivalence dimensions checked:
Focused tests:
Adjacent/full relevant tests:
Static checks/build/package:
Real scenario:
Final diff inspection:
Cleanup of artifacts/processes:
Remaining risks and deferred findings:
Verdict: APPROVE | REJECT | INCONCLUSIVE
```

### Verdict rules

- **APPROVE** only when bound scope, behavior lock, safety, repository validation, real surface,
  final diff, and cleanup all pass with no unresolved blocker.
- **REJECT** when behavior, safety, compatibility, scope, or evidence regresses.
- **INCONCLUSIVE** when required evidence cannot be obtained. State exactly what is missing and
  what would resolve it; never translate unavailable evidence into approval.

Report beneficial behavior changes separately as proposals. Do not attribute untouched files to
the cleanup, claim performance without measurement, or use deleted-line count as quality evidence.
