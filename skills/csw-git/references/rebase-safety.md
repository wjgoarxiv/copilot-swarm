# Rebase safety

## Authorization gate

Rebase rewrites commit identity. Require an explicit request for execution. Planning, explanation,
or “make commits clean” does not automatically authorize rewriting.

## Preflight

Record:

- current branch and HEAD;
- exact base and commit range;
- upstream and ahead/behind counts;
- whether commits were pushed or consumed;
- open pull request or integration state when relevant;
- dirty, staged, untracked, submodule, and nested-repository state;
- signatures, merge commits, generated artifacts, and hooks;
- recovery branch or reference.

Refresh remote state only when network access and the operation require it. Do not assume a local
tracking ref is current.

## Plan the sequence

For each commit decide keep, reorder, reword, squash, fixup, split, or drop. Explain why the final
sequence is independently reviewable and which checks run after conflict-prone steps.

## Conflict resolution

Read base, both sides, and intended final contract. Search subsequent commits because a later change
may depend on one side. Resolve deliberately; never choose all “ours” or “theirs” across a repository
without per-conflict evidence.

After each resolution:

- remove conflict markers;
- inspect staged diff;
- run focused verification;
- confirm generated files are produced by owner commands;
- continue only when the step is coherent.

## Split commits

When splitting, preserve the remaining worktree, stage one atomic group, verify and commit it, then
continue with the rest. Reinspect staged diff before every new commit.

## Post-rebase comparison

- compare old and new ranges by patch and intent;
- inspect messages and authorship/signatures;
- run focused and full relevant tests;
- inspect worktree and upstream divergence;
- verify recovery reference still exists;
- check nested repositories and generated output.

## Push boundary

Pushing rewritten history requires separate explicit authorization. Refresh remote state and use
lease protection. If the lease rejects the update, stop and inspect remote changes; never replace
it with an unconditional force push.

## Abort and recovery

Abort when the approved plan is wrong, conflicts expose an unknown contract, unrelated work
overlaps, or verification cannot be restored. Use the recovery reference and [History and recovery]
(history-and-recovery.md) to inspect the pre-rewrite state without discarding user work.

## Rebase receipt

```text
Old range/head:
New range/head:
Base:
Pushed/shared status:
Recovery reference:
Conflicts and resolutions:
Verification:
Remaining worktree:
Push performed: yes/no
```

## Rebase conflict worksheet

Resolve each conflict from intent, not marker removal:

```text
Path:
Base behavior:
Current-side intent:
Incoming-side intent:
Chosen combined behavior:
Contract or test proving it:
Follow-up risk:
```

After staging a resolution, inspect the staged diff for that path before continuing. Search for
remaining conflict markers, but do not treat their absence as proof that behavior is correct.

## Empty and duplicate commit handling

If replay reports an empty commit, determine why:

- the patch already exists upstream;
- a prior conflict resolution absorbed it;
- the commit contained only generated output;
- the intended change was accidentally discarded.

Skip only when the resulting tree and history still preserve the commit's intent. Record the old
commit, evidence, and decision in the receipt. If intent is uncertain, abort and inspect rather
than automatically dropping it.

## Interrupted operation recovery

Before resuming an interrupted rebase:

1. inspect the operation state and current patch;
2. verify the worktree contains no unrelated new edits;
3. reread the remaining todo sequence;
4. confirm the recovery reference still names the pre-rewrite head;
5. complete or abort the current conflict deliberately;
6. rerun range comparison and verification at the end.

Never start a second history operation on top of an unresolved one.

## Shared-history decision

If any old commit is already shared, name the affected branch, upstream, and collaborators before
rewriting. Prefer a non-rewriting integration when coordination or lease safety is uncertain.
Authorization to commit is not authorization to rewrite or push shared history.
