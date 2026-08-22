# History and recovery

## Match query to question

| Question | Primary command family |
| --- | --- |
| When did this exact string change? | `git log -S` |
| Which diff touched this pattern? | `git log -G` |
| Who last changed these lines? | `git blame`, then inspect commit |
| How did this file evolve? | `git log --follow -- <path>` |
| What does this revision contain? | `git show` |
| Which commit introduced a deterministic regression? | `git bisect` |
| Where did a lost HEAD point? | `git reflog` |

Quote patterns and revisions. Limit paths when the question is path-specific.

## History evidence

Read commit patch, parent context, message, related tests, and subsequent fixes. A commit message is
an author's claim. The patch and surviving behavior are stronger evidence.

## Blame caution

Movement, formatting, generated output, and bulk refactors can obscure origin. Use move/copy-aware
options when appropriate and follow parent commits. Do not infer ownership, intent, or fault from
one blame result.

## Bisect contract

Use a deterministic command with clear exit meanings: good, bad, and skip only when the revision
cannot be tested for a documented reason. Preserve the starting refs and exit bisect state after
the result. Rerun the candidate manually to confirm.

## Recovery intake

Before mutation capture:

- status and current branch;
- current HEAD and reflog;
- operation state such as rebase, merge, cherry-pick, or bisect;
- staged, unstaged, untracked, ignored, and conflict files;
- stashes and worktrees;
- upstream and remote refs when relevant;
- exact state the user wants restored.

## Non-destructive first moves

- create a recovery branch at the known commit;
- create a separate worktree for inspection;
- copy a patch or artifact outside the uncertain operation when authorized;
- inspect reflog and object reachability;
- restore one reviewed path rather than the entire tree.

Do not clean untracked files or hard-reset a mixed worktree as a generic recovery step.

## Recovery scenarios

### Lost commit

Find the object through reflog or known references, inspect it, create a named branch, and verify
the expected patch before any further rewrite.

### Accidental staged content

Unstage only the reviewed paths while preserving working-tree content. Reinspect status and staged
diff.

### Interrupted operation

Determine whether continue or abort matches the user's desired final state. Inspect operation
metadata and conflicts first; abort can itself restore a different state than expected when other
changes overlap.

### Deleted path

Identify the exact revision and whether the path had uncommitted changes. Restore from a known
source only after preserving any current replacement.

## Recovery receipt

```text
Original state:
Desired restored state:
Safety reference created:
Commands:
Resulting HEAD/status:
Verification:
Remaining uncertainty:
```
