# Scheduling, failure, and synthesis

Native Copilot CLI schedules tasks. The conductor provides dependency order,
packets, monitoring decisions, skeptical acceptance, and cleanup.

## Dependency graph

Represent tasks as waves:

```text
Wave 1: independent discovery A, B, C
Gate 1: conductor verifies citations and chooses contract
Wave 2: isolated writers D and E on disjoint approved paths
Gate 2: conductor inspects diffs and integrates in dependency order
Wave 3: independent review lanes
Gate 3: consolidated verdict and completion proof
```

Do not release a wave until its predecessor gate has real evidence.

## Native scheduling surfaces

- `task`: launch a focused worker with a self-contained packet;
- `/fleet`: show user-visible parallel execution when requested;
- `/tasks`: inspect state, wait, steer, or cancel work.

Do not infer success from disappearance, silence, or elapsed time. Inspect terminal
task state and actual deliverables.

## Monitoring checklist

For each active task record:

- task and worker identity;
- dependency wave;
- read-only policy or worktree;
- expected deliverable;
- launch state and latest native status;
- timeout/cancellation risk;
- shared-resource ownership;
- accepted, retried, cancelled, failed, or blocked disposition.

Avoid constant polling that adds noise. Check at meaningful state boundaries or when
the task exceeds its expected window.

## Failure classification

| Failure | Likely response |
| --- | --- |
| malformed/empty result | clarify packet and retry once if safe |
| wrong scope | reject, tighten packet, inspect side effects |
| dependency unknown | serialize behind discovery |
| tool unavailable | rescope or escalate environment blocker |
| timeout | inspect native state/resources, cancel if needed, cleanup |
| cancellation | verify terminal state and resource cleanup |
| assigned writer failure | reject, preserve evidence, add runtime blocker, and stop |
| merge conflict | resolve from intent and criteria, rerun both proofs |
| shared-resource collision | stop, clean, namespace or serialize |
| unsafe command suggestion | reject command; obtain argv from owned source |

Worker failure never becomes a passing task because another worker succeeded.

## Retry policy

An assigned writer failure is terminal for the current run. The conductor must
not perform the worker-owned mutation, launch a replacement writer, or repeat the
same packet. This prevents conductor takeover from turning a failed isolation lane
into misleading apparent success. Preserve evidence, clean owned state, add a
runtime blocker, and stop. Any later retry requires a corrected bounded packet in
a new run under the applicable approval boundary.

Retry only when:

- the failure cause is understood;
- the revised packet changes the failure condition;
- cleanup from the previous attempt is verified;
- authority and isolation remain valid;
- repeated read-only work is cheaper than escalation.

Do not retry the same packet indefinitely. Escalate persistent environmental or
authority blockers with exact evidence.

## Cancellation and timeout cleanup

Cancellation is a request, not proof of teardown. After `/tasks` cancellation or a
timeout:

1. confirm native task terminal state;
2. inspect observed child processes;
3. check ports, terminal sessions, containers, recorders, and temp paths;
4. preserve partial worktree changes for inspection;
5. remove only owned disposable resources;
6. record a cleanup receipt.

Daemonized commands may outlive a task. Avoid them and verify cleanup independently.

## Result acceptance

For read-only results:

- reopen local path citations;
- open pinned primary-source links;
- distinguish fact, inference, and recommendation;
- reject uncited or out-of-scope claims.

For writing results:

- inspect worktree status and complete diff;
- rerun focused and full relevant tests;
- run diagnostics and source-trace scans;
- inspect real surfaces where the task promised them;
- integrate and reverify the final tree.

## Integration order

Integrate according to dependency, not completion time. A later-finishing contract
task may need to precede an earlier-finishing consumer task.

After each integration:

- inspect final diff;
- rerun affected focused tests;
- detect conflicts with remaining worktrees;
- update downstream packets if the approved contract changed;
- invalidate worker evidence that no longer matches the integrated tree.

## Synthesis packet

```text
Original decomposition:
Dependency waves:
Workers/tasks and terminal states:
Read-only policy/worktrees:
Accepted findings or diffs:
Rejected/failed/cancelled results:
Conductor verification:
Integration identities:
Conflicts and resolutions:
Remaining blockers:
Cleanup state:
```

Synthesis resolves contradictions using evidence and the approved scope. It does not
average conflicting worker opinions.

## Completion checklist

- [ ] all tasks terminal in `/tasks`;
- [ ] every accepted result independently verified;
- [ ] every rejected/failed/cancelled task accounted for;
- [ ] final integrated tree tested and reviewed;
- [ ] no hidden dependency or shared-resource conflict;
- [ ] worktrees and temporary branches handled safely;
- [ ] processes, ports, sessions, containers, and temp paths clean;
- [ ] user-visible summary reports outcome and evidence, not worker count.
