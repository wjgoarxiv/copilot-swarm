---
name: csw-deslop
description: Remove mechanical and AI-generated code smells from a bound diff while locking behavior, preserving intentional safeguards, and applying an evidence-based review rubric.
---

# Remove AI code smells

Use this skill when the user requests cleanup of recent generated code, mechanical patterns,
unnecessary abstraction, filler prose, or a bounded quality pass. The goal is clearer behavior
with equal or better safety—not making every file look stylistically identical.

## Copilot CLI compatibility

- Bind scope with Git and repository paths before editing.
- Use the host `task` tool only when independent categories or directories can be isolated.
- Read-only workers require host-enforced non-mutating tools; writers require isolated worktrees.
- Re-read worker diffs and rerun focused verification before integration.
- Do not stage, commit, reset, rebase, or discard unrelated work unless explicitly requested.

## Required references

- [Smell catalog](references/smell-catalog.md)
- [Behavior lock](references/behavior-lock.md)
- [Review rubric](references/review-rubric.md)
- [Language-specific cleanup](references/language-specific-cleanup.md) — read before changing
  idioms, error flow, ownership, or generated-looking patterns in a specific language.
- [Performance and behavior equivalence](references/performance-and-behavior-equivalence.md) —
  read when cleanup touches evaluation order, caching, batching, concurrency, or resource use.
- [Module-boundary triage](references/module-boundary-triage.md) — read before moving helpers,
  splitting modules, collapsing wrappers, or changing dependency direction.
- [Cleanup casebook and reporting](references/cleanup-casebook-and-reporting.md) — use for worked
  comparison cases, reviewer packets, and the final evidence-bound verdict.

## Scope gate

Resolve one of these explicit scopes:

- branch or commit range;
- staged or unstaged diff;
- named files or directories;
- code created by a specified task;
- one named smell category.

Record excluded dirty files and generated/vendor paths. Do not expand from a bounded diff to a
repository-wide rewrite because adjacent code looks imperfect.

## Baseline

Before cleanup:

1. read repository instructions and conventions;
2. capture worktree and diff statistics;
3. run focused and adjacent tests;
4. identify public API, serialization, configuration, and error contracts;
5. exercise the relevant real user scenario;
6. record known failures and intentional compatibility code.

If behavior is not adequately pinned, establish a behavior lock before editing. Follow
[Behavior lock](references/behavior-lock.md).

## Behavior lock

A cleanup is behavior-preserving unless the user explicitly authorizes a behavior change. Pin:

- happy output;
- boundary and malformed input;
- error type, status, and cleanup;
- ordering and idempotence when relevant;
- public imports, schemas, and configuration;
- real user scenario.

Characterization tests may document surprising current behavior without endorsing it. Separate
intentional corrections into a named behavior-change slice.

## Smell catalog

Classify findings before editing. Use the full [Smell catalog](references/smell-catalog.md).

### Commentary smells

- comments narrating syntax instead of intent;
- headings or docstrings that repeat the identifier;
- vague TODOs without owner, condition, or decision;
- overconfident prose unsupported by runtime evidence;
- duplicated comments that drift from the code.

### Structural smells

- one-call forwarding helpers with no owned contract;
- speculative interfaces or configuration variants;
- repeated local wrappers around a stable dependency;
- mixed-responsibility modules and generic utility buckets;
- duplicated parsing or validation beyond the trust boundary;
- dead compatibility layers and unreachable branches.

### Defensive smells

- broad catches that convert every failure into one fallback;
- null checks or type tests already guaranteed by internal types;
- retry, timeout, or fallback added without a named failure model;
- swallowed errors and ambiguous sentinel values;
- security checks removed as “redundant” without proof.

### Performance smells

- hidden nested scans;
- repeated file/network/database operations;
- serialization at every layer;
- unbounded concurrency, queues, retries, or retained state;
- expensive work performed before cheap rejection.

### Test smells

- mocks that assert their own configuration;
- tests coupled to private call order;
- snapshots of unstable prose instead of structured behavior;
- sleeps and timing flakes;
- happy-path-only coverage;
- skipped tests introduced to hide a regression.

## Preserve list

Do not remove or simplify without direct evidence:

- comments explaining rationale, protocol rules, security boundaries, or compatibility;
- validation at an actual trust boundary;
- cleanup for partial initialization and cancellation;
- typed errors or causal context;
- compatibility required by supported consumers;
- generated markers and tool directives;
- accessibility behavior;
- platform or feature-flag variants that are tested and supported.

Shorter code is not automatically better code.

## Cleanup plan

Group findings by category and cohesive area. For each group, record:

- exact files and findings;
- behavior being preserved;
- focused test command;
- expected diff shape;
- risk and rollback;
- real scenario affected.

Order work from safest mechanical cleanup to structural changes. Reclassify a structural cleanup
as a refactor when callers, modules, or public contracts move.

## Cleanup loop

Use `PIN → REMOVE → TEST → DIFF → SURFACE`:

1. **PIN:** run the relevant behavior lock.
2. **REMOVE:** make the smallest cohesive cleanup.
3. **TEST:** run focused tests and static diagnostics.
4. **DIFF:** inspect for behavior drift, deleted safeguards, or scope expansion.
5. **SURFACE:** exercise the real scenario when runtime behavior could be affected.

Finish one group before starting another. Do not combine formatting across unrelated files with a
behavior-sensitive cleanup.

## Quality gates

Every cleanup must pass:

| Gate | Question |
| --- | --- |
| Necessity | Did the removed item lack a real contract or rationale? |
| Behavior | Do characterization and regression tests still pass? |
| Boundary | Are validation, security, error, and cleanup guarantees preserved? |
| Architecture | Is ownership clearer without a generic abstraction? |
| Performance | Did I avoid creating repeated work or unbounded behavior? |
| Scope | Does the final diff remain inside the bound range? |
| Surface | Does the real user workflow still work? |

Use the [Review rubric](references/review-rubric.md) for a final independent pass.

## Abort and escalation

Stop when:

- the behavior contract is ambiguous;
- baseline tests fail in the target area;
- unrelated dirty work overlaps the same lines;
- a “cleanup” requires public API or data migration;
- an apparent redundancy protects a security or compatibility boundary;
- generated code would be edited manually;
- removing a layer changes observable failure behavior.

Route structural work through `csw-refactor` and behavior changes through `csw-programming`.

## Verification

Run focused tests after each group, then adjacent/full relevant suites, typecheck, lint, format
check, build, and the real scenario. Review the final diff with the rubric. Confirm no safeguard,
public export, supported configuration, or error cause disappeared accidentally.

## Completion report

Report bound scope, baseline, categories removed, items deliberately preserved, tests observed,
real user scenario, final diff review, cleanup, and remaining risks. Do not describe untouched code
as cleaned and do not claim success from a smaller line count alone.
