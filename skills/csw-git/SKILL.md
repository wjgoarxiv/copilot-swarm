---
name: csw-git
description: Perform conservative Git status, commit, history, rebase, and recovery work with explicit mode selection, atomic scope, conflict evidence, and non-destructive recovery paths.
---

# Git master

Use this skill for repository status, commit planning, history investigation, blame, bisect,
rebase, squash, conflict resolution, or recovery. Git operations are state changes with potentially
shared consequences; determine authority and pushed state before mutation.

## Copilot CLI compatibility

- Run Git through the host shell permission model.
- This skill never grants permission to commit, push, tag, rebase, reset, force-update, or discard.
- Preserve unrelated dirty and untracked work.
- Prefer non-interactive commands and explicit paths.
- Use host workers only for independent read-only history analysis under enforced non-mutating tools.

## Required references

- [Commit strategy](references/commit-strategy.md)
- [History and recovery](references/history-and-recovery.md)
- [Rebase safety](references/rebase-safety.md)

## Mode gate

Select exactly one primary mode:

| Mode | User intent | Mutation allowed? |
| --- | --- | --- |
| Status | understand branch/worktree/upstream | no |
| Commit planning | propose atomic groups/messages | no |
| Commit execution | stage and create authorized commits | yes, explicit request |
| History investigation | find origin, author, regression | no |
| Rebase planning | inspect range, risks, recovery | no |
| Rebase execution | rewrite local history | yes, explicit request |
| Recovery | restore from known Git state | depends on exact request |

Do not turn “review these changes” into a commit, or “clean history” into a rebase, without explicit
authorization.

## Ground truth packet

Use the relevant subset:

```sh
git status --short
git branch --show-current
git diff --stat
git diff --staged --stat
git diff
git diff --staged
git log -30 --oneline --decorate
git rev-parse HEAD
git rev-parse --abbrev-ref '@{upstream}'
git rev-list --left-right --count HEAD...'@{upstream}'
```

Quote revision expressions so the shell cannot reinterpret them. A missing upstream is unknown,
not proof that work is private. Inspect remotes and hosting state when the operation depends on it.

## Worktree ownership

Classify every changed path:

- created by the current task;
- pre-existing user change;
- generated output;
- ignored local state;
- submodule or nested repository;
- unresolved conflict;
- unknown ownership.

Never stage “all” until ownership and scope are known. Prefer explicit paths or reviewed hunks.

## Commit planning

Before staging:

1. inspect full unstaged and staged diffs;
2. identify repository message style and contribution rules;
3. group by one behavior or independently revertible purpose;
4. keep implementation with its direct tests and factual docs;
5. separate unrelated formatting, generated output, dependency changes, and migrations;
6. name verification required for each group.

Use [Commit strategy](references/commit-strategy.md). A small commit is not automatically atomic;
an atomic commit is coherent, buildable where practical, and independently explainable.

## Commit execution

Only after explicit request:

1. stage one reviewed group by path or hunk;
2. inspect `git diff --staged` completely;
3. run the group's verification;
4. create the commit using repository style;
5. inspect the resulting commit and remaining worktree;
6. report hash, message, files, verification, and unstaged changes.

Do not amend or sign unless requested or required by established repository policy and available
configuration.

## History investigation

Choose the query by question:

- exact text added/removed: `git log -S`;
- diff matching a pattern: `git log -G`;
- line attribution with movement context: `git blame` then inspect commit;
- file evolution across renames: `git log --follow -- <path>`;
- known good/bad regression: `git bisect` with a deterministic test;
- commit contents: `git show --stat --patch <revision>`.

Read the actual diff and surrounding history. A blame line names the last textual change, not
necessarily the design owner or root cause. Follow [History and recovery](references/history-and-recovery.md).

## Rebase planning

Before rewriting:

- identify exact branch, base, range, upstream, and ahead/behind state;
- determine whether commits were pushed or consumed by others;
- record current HEAD and a recovery reference;
- inspect merges, signatures, submodules, generated artifacts, and conflicts likely to recur;
- define desired commit sequence and verification after each logical group;
- require explicit approval for force update.

If shared history risk is unclear, stop at a plan. See [Rebase safety](references/rebase-safety.md).

## Rebase execution

Use non-interactive mechanisms when they can express the approved plan. During conflicts:

1. read base/ours/theirs and surrounding history;
2. resolve according to intended final behavior, not by choosing one side wholesale;
3. inspect conflict markers and staged resolution;
4. run focused verification;
5. continue only after the current step is coherent.

After completion, compare old and new ranges, run regression tests, inspect worktree, and verify
recovery references. Use `--force-with-lease` only when push was explicitly authorized and remote
state was freshly checked.

## Recovery

Start with observation: status, reflog, current/previous HEAD, stash list, untracked files, and any
operation state. Do not reach first for destructive reset or checkout.

Prefer creating a recovery branch or worktree from the known commit before manipulating uncertain
state. Restore only paths and state the user identified. Never delete untracked files as generic
cleanup.

## Submodules and nested repositories

Treat each repository as a separate ownership and status surface. A parent diff may contain only a
pointer change while the nested worktree has its own dirty files. Record both before commit or
recovery decisions.

## Verification

After mutation, inspect:

- `git status --short`;
- resulting commit/range and messages;
- staged and unstaged diffs;
- upstream divergence;
- conflict markers;
- relevant tests and real scenario;
- recovery reference and remaining dirty files.

## Completion report

Report selected mode, commands, hashes, messages, verification, upstream state, remaining worktree,
and recovery path. Never claim a push, remote update, or clean worktree without observing it.
