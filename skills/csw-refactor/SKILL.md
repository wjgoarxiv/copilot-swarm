---
name: csw-refactor
description: Restructure code without unintended behavior change through an explicit intent gate, dependency codemap, characterization tests, reversible checkpoints, and real-surface comparison.
---

# Refactor

Use this skill for module splits, renames, extraction, dependency inversion, API migration,
architecture cleanup, or modernization where behavior must remain stable. Refactoring changes
structure; requested behavior changes must be separated and tested as their own work.

## Copilot CLI compatibility

- Prefer native symbol and language-server operations when they are configured and initialized;
  otherwise combine repository search, build metadata, and tests.
- Use host `task` workers only for independent analysis. Read-only workers need host-enforced
  non-mutating tools; writing workers need isolated worktrees.
- Inspect actual diffs and rerun verification before integrating any worker result.
- This skill does not authorize commits, rebases, dependency upgrades, global installs, or
  edits outside the requested repository.

## Required references

- [Codemap template](references/codemap-template.md)
- [Verification strategy](references/verification-strategy.md)
- [Execution and recovery](references/execution-and-recovery.md)
- [Decision and pattern playbook](references/decision-and-pattern-playbook.md) — select and execute
  rename, extract, move, split, inversion, public migration, and generated-boundary patterns.
- [Language and runtime checklists](references/language-and-runtime-checklists.md) — load the
  JS/TS, Python, Go, Rust, or distribution checks that match the repository.
- [Worker packets and integration](references/worker-packets-and-integration.md) — delegate
  host-enforced read-only analysis or isolated writer slices, then inspect and integrate evidence.

## Intent gate

Before analysis, state:

- structural outcome requested;
- behaviors and public contracts that must remain unchanged;
- allowed API, import, serialization, or migration changes;
- exact repository and path scope;
- explicit non-goals;
- real scenario used for before/after comparison.

If the user asks for both a refactor and new behavior, split the work into separately testable
slices. If the desired outcome cannot be distinguished from a redesign, clarify before editing.

## Baseline gate

Record:

1. branch and dirty worktree state;
2. focused and adjacent test status;
3. typecheck, lint, and build status;
4. current user scenario output;
5. known failures accepted as pre-existing;
6. generated, vendored, or ownership-restricted paths.

Stop when baseline failures overlap the target and cannot be explained. Do not make structural
changes on top of an unknown regression.

## Build the codemap

Map the target before planning edits:

- symbols and files directly changed;
- callers and importers;
- data flow and side effects;
- public exports and plugin registration;
- serialization, configuration, and persisted state;
- generated-code ownership;
- tests that cover each contract;
- cleanup and lifecycle owners;
- dependency direction and cycles.

Classify impact zones:

| Zone | Meaning | Required treatment |
| --- | --- | --- |
| Direct | definition or file moves | edit and focused verification |
| Contract | public API, data, config, registration | compatibility proof |
| Caller | imports, invocations, type consumers | reference migration |
| Runtime | startup, lifecycle, side effects | real-surface scenario |
| Distribution | package, install, generated output | clean-consumer proof |
| Documentation | user commands and examples | factual update |

Use the [Codemap template](references/codemap-template.md) rather than keeping the map implicit.

## Characterization gate

Before changing structure:

1. Identify behavior not already pinned by tests.
2. Add characterization tests at the most stable observable boundary.
3. Run them and capture the baseline.
4. Avoid pinning accidental whitespace, private calls, or incidental ordering.
5. Cover at least one failure or boundary path affected by the move.

A characterization test records existing behavior; it does not endorse it. Document surprising
behavior separately so a later change can be intentional.

## Plan reversible checkpoints

Each checkpoint has one structural purpose and can be understood or rolled back independently.
Typical sequence:

1. add missing tests;
2. introduce target module or interface without switching callers;
3. move one cohesive concept;
4. migrate callers by dependency group;
5. remove compatibility path after all callers move;
6. update public docs and packaging;
7. run full comparison and cleanup.

Avoid a checkpoint that simultaneously renames, reformats, changes behavior, upgrades dependencies,
and moves files.

## Execution loop

For every checkpoint use `PIN → MOVE → DIAGNOSE → TEST → DIFF → SURFACE`:

### PIN

Re-read the codemap and name the exact preserved contract and affected zones.

### MOVE

Make the smallest structural change. Preserve behavior, error semantics, lifecycle, and public
surface unless the plan explicitly authorizes a transition.

### DIAGNOSE

Run symbol diagnostics or searches for unresolved imports, missed callers, type drift, cycles,
and registration changes.

### TEST

Run characterization and focused tests, then the adjacent suite for the affected zones.

### DIFF

Inspect the actual diff for hidden behavior changes, broad formatting churn, hand-edited generated
files, removed safeguards, or unrelated work.

### SURFACE

Exercise the preserved real scenario at checkpoints that change runtime or distribution behavior.

Do not accumulate several unverified moves before running this loop.

## Public contract migrations

When a public path or schema must change:

- identify the support window and consumers;
- prefer additive compatibility before removal;
- make deprecation observable and documented;
- preserve stable error and serialization semantics;
- test old and new paths during the transition;
- remove the bridge only after consumer evidence is complete.

Do not keep indefinite compatibility “just in case.” Every bridge needs an owner and removal gate.

## Dependency inversion

Introduce an interface only when it establishes a real boundary between policy and adapter, enables
multiple current implementations, or allows truthful testing of an inaccessible external system.
Do not wrap a library one-for-one without owning a distinct contract.

## Rename discipline

Use symbol-aware rename when available and verify it initialized. Then search for strings, config,
reflection, serialization keys, docs, fixtures, snapshots, and generated registration that symbol
tools cannot see. Preserve case variants and user-visible names only when the contract requires it.

## Abort conditions

Stop and report when:

- baseline is failing in the target area without explanation;
- the public contract or migration window is ambiguous;
- unrelated dirty work overlaps the same lines;
- generated code would need manual edits;
- a required consumer or platform cannot be verified;
- the next step crosses repository or authorization scope;
- behavior changed unexpectedly and the causal checkpoint is unknown.

Use [Execution and recovery](references/execution-and-recovery.md) to return to the last known
checkpoint without discarding user work.

## Verification strategy

The minimum complete matrix includes:

- characterization tests before and after;
- focused tests per checkpoint;
- static diagnostics and dependency/cycle checks;
- adjacent and full relevant regression suite;
- public export or schema comparison;
- original real user scenario;
- packed/installed consumer when distribution changed;
- cleanup receipt.

Details and boundary cases are in [Verification strategy](references/verification-strategy.md).

## Final review

Confirm:

- every mapped caller migrated or intentionally remains;
- preserved contracts have before/after evidence;
- no behavior change hides in renamed or moved code;
- compatibility bridges have explicit lifetimes;
- generated files were produced by their owner command;
- module responsibilities are clearer than before;
- temporary adapters, processes, and artifacts are gone;
- the final diff contains only authorized scope.

## Completion evidence

Report the intent gate, baseline, codemap, checkpoint list, structural result, preserved contracts,
verification commands, real scenario comparison, rollback/recovery decisions, cleanup, and remaining
risk. Do not mix an unrequested commit or history rewrite into the refactor.
