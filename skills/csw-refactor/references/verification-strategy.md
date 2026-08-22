# Verification strategy

## Baseline packet

Capture before the first structural edit:

- worktree and branch state;
- focused, adjacent, and full relevant tests;
- typecheck, lint, format check, and build;
- public exports or schema snapshot;
- original real scenario;
- known failures and accepted exclusions.

The baseline must be replayable. “Tests were green earlier” is not evidence.

## Characterization selection

Pin behavior at the most stable boundary:

- pure output for pure decisions;
- public API for module moves;
- protocol exchange for adapters;
- command exit/output for CLI work;
- rendered/accessibility state for UI work;
- packed consumer for distribution work.

Avoid tests that assert private call order, internal file paths, or incidental formatting unless
those are explicit contracts.

## Checkpoint verification

For each checkpoint:

1. run unresolved-reference or diagnostic checks;
2. run targeted characterization tests;
3. run tests for affected callers;
4. inspect public export or schema drift;
5. inspect the diff;
6. exercise the real scenario when a runtime boundary moved;
7. confirm cleanup.

## Boundary cases

Select applicable cases:

- old and new import path during migration;
- empty and malformed serialized state;
- unsupported configuration variant;
- failure before and after resource acquisition;
- cancellation during moved async work;
- dynamic registration or plugin discovery;
- generated output and package allowlist;
- platform or feature-flag variant;
- stale consumer using the compatibility bridge.

## Contract comparison

Compare behavior, not just names:

- return and error semantics;
- ordering and idempotence;
- defaults and normalization;
- lifecycle and side effects;
- serialization and compatibility;
- performance budgets;
- logs or telemetry only when they are public operations contracts.

## Distribution proof

When files, exports, manifests, or installers change:

- build or pack from the allowlisted source;
- inspect the produced artifact;
- install into a fresh consumer or host surface;
- resolve version and installed path;
- run a real scenario outside the source checkout;
- clean the temporary consumer.

## Real scenario comparison

Record channel, input, before observation, after observation, exit/status, and artifact path. If
the expected output intentionally changes, separate that behavior change from the structural proof.

## Final matrix

- [ ] Baseline captured.
- [ ] Characterization observed unchanged.
- [ ] Every checkpoint passed focused verification.
- [ ] Adjacent and full relevant suites passed.
- [ ] Diagnostics and static checks passed.
- [ ] Public contracts compared.
- [ ] Distribution proved when applicable.
- [ ] Real scenario compared.
- [ ] Cleanup receipt recorded.

## Evidence table template

| Contract | Before command/artifact | After command/artifact | Verdict |
| --- | --- | --- | --- |
| public API | | | |
| error behavior | | | |
| serialization | | | |
| runtime lifecycle | | | |
| package/install | | | |
| real scenario | | | |

## Negative verification

Prove removed paths are actually unused: old imports fail or warn according to the migration plan,
deprecated registration is absent after its support window, stale generated output is not packed,
and no compatibility file remains accidentally reachable.

## Performance-sensitive moves

Use the same workload, warmup, environment, and sample method before and after. Compare I/O count,
queries, allocations, serialization, and latency distribution. A structural move should not change
the performance budget without explicit authorization.
