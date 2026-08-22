# Execution and recovery

## Checkpoint packet

Before a checkpoint, record:

- purpose and affected impact zones;
- current diff and dirty-work boundaries;
- preserved contract;
- narrow verification command;
- rollback method that will not discard unrelated work.

After a checkpoint, record commands, exit status, diff summary, real-surface observation when
applicable, and cleanup.

## Reversible techniques

- Introduce new module before deleting old location.
- Add compatibility export before migrating consumers.
- Move one cohesive responsibility at a time.
- Separate mechanical rename from semantic cleanup.
- Regenerate artifacts with owner commands.
- Remove bridges only after the caller map is empty.

## Unexpected behavior change

When behavior changes:

1. stop further checkpoints;
2. reproduce with the narrowest preserved test;
3. inspect only the latest structural diff;
4. determine whether ordering, defaults, errors, side effects, or lifecycle changed;
5. repair or reverse only that checkpoint;
6. rerun its full verification before continuing.

Do not stack a compensating patch on an unexplained regression.

## Recovery without data loss

Never use destructive reset or checkout to erase a mixed worktree. Prefer:

- manually reversing the current cohesive edit;
- applying the inverse of a reviewed patch;
- restoring only files created wholly by the current checkpoint when ownership is certain;
- using a dedicated worktree for risky migration work;
- asking the user when unrelated changes overlap.

## Compatibility bridge lifecycle

Every bridge records:

- consumers it supports;
- warnings or telemetry;
- removal condition;
- verification for old and new paths;
- owner and target milestone when such metadata exists.

An indefinite alias is architecture, not a temporary bridge; judge it explicitly.

## Failure modes

### Missed dynamic caller

Restore compatibility, expand search to strings/config/registration, update the codemap, and add a
test proving discovery.

### Generated diff

Revert only the unauthorized manual edit, run the owning generator, and inspect the generated diff.

### Dependency cycle

Do not add a global registry to hide it. Revisit dependency direction and move the stable contract
to the correct layer.

### Test pins implementation

Rewrite the test at the observable contract before continuing the structural move.

### Performance regression

Restore the baseline workload, profile the moved boundary, and compare allocation, I/O, query, and
serialization behavior before optimizing.

## Completion recovery audit

- [ ] No unexplained behavior drift.
- [ ] No orphan compatibility bridge.
- [ ] No missed caller or registration.
- [ ] No generated file hand edit.
- [ ] No hidden dependency cycle.
- [ ] No unrelated work discarded.
- [ ] All temporary resources removed.
- [ ] Original real scenario passes.

## Checkpoint naming

Name checkpoints by the structural fact they establish: “introduce parser boundary,” “move storage
adapter,” or “switch CLI callers.” Avoid names such as “cleanup part 2” that cannot explain the diff
or rollback scope.

## Partial completion

If the task must stop, leave the repository in a supported state: both compatibility paths work or
the new path has not been activated. Record completed checkpoints, active bridge, remaining callers,
verification status, and the exact next reversible step.

## Cleanup receipt template

```text
Temporary worktrees:
Processes/sessions:
Ports/containers:
Generated artifacts:
Compatibility bridges retained:
Verification rerun:
Remaining risk:
```

## Review before continuation

After interruption, re-read the codemap, worktree diff, last checkpoint evidence, and current test
state. Do not resume from a remembered step number when files or callers may have changed.
