# Commit strategy

## Read repository policy

Inspect contribution instructions, hooks, signing requirements, message history, generated files,
and required checks. Do not impose a message convention from another repository.

## Atomic grouping questions

For every changed path ask:

- Which user-visible or internal behavior does it implement?
- Can it be reverted without breaking another group?
- Does its direct test belong with it?
- Is the documentation factual only after this group lands?
- Does a manifest change require its lockfile or generated artifact?
- Is the change pre-existing or unrelated?

## Typical group boundaries

Keep together:

- implementation and direct regression tests;
- schema and required migration;
- manifest and corresponding lockfile;
- public behavior and factual user documentation;
- generator source and generated output when policy tracks both.

Usually separate:

- unrelated formatting;
- dependency upgrade from feature code unless inseparable;
- broad rename from behavior change;
- cleanup outside the task;
- multiple independently revertible fixes.

## Commit plan template

```text
Commit 1 purpose:
Paths/hunks:
Behavior or contract:
Verification:
Dependencies on other commits:
Proposed message:
Remaining worktree after commit:
```

## Staging discipline

Use explicit paths or reviewed hunks. After staging, inspect the complete staged diff—not only
`--stat`. Verify that tests, docs, lockfiles, and generated artifacts are grouped deliberately and
that unrelated user work remains unstaged.

## Message quality

Follow local style. A useful subject names the behavior or structural purpose, not the file-edit
mechanism. The body, when needed, explains why, compatibility, migration, or non-obvious tradeoffs.
Do not claim tests, issue closure, or breaking behavior that was not verified.

## Pre-commit verification

- [ ] Staged diff reviewed.
- [ ] No secrets or local configuration.
- [ ] No conflict markers.
- [ ] Focused test passes.
- [ ] Required static/build checks pass.
- [ ] Generated output is owned and current.
- [ ] Remaining unstaged work is understood.

## Post-commit verification

Inspect the commit's patch and metadata, run status, and confirm the intended paths remain or were
removed from the worktree. Report hash and exact verification. Do not assume a hook ran simply
because commit creation succeeded.

## Partial or failing commit

If a hook or check fails, inspect its output and current index. Do not bypass, amend, or restage
broader changes automatically. Fix the scoped cause, rerun verification, and review staged diff
again.

## Multiple commits

Verify each logical checkpoint where practical. A final full suite does not prove an intermediate
commit is buildable. If an intentionally dependent sequence cannot pass individually, state that
constraint in the plan.
