# Debugging methodology routes

| Phase or boundary | Leaf |
| --- | --- |
| Capture environment, reproduction, processes, ports, and artifact ownership | [Session setup](00-setup.md) |
| Cross an ownership, access, or production-only boundary | [Escalation](05-escalate.md) |
| Convert a proven mechanism into a failing regression and minimal fix | [Causal fix](06-fix.md) |
| Exercise CLI, API, UI, worker, protocol, or package surfaces | [Real-surface QA](08-qa.md) |
| Revert instrumentation and verify process/filesystem cleanup | [Cleanup and final verification](09-cleanup.md) |
| Runtime execution is blocked but independent signals remain available | [Partial runtime evidence](partial-runtime-evidence.md) |

Do not read every phase by default. The active investigation should name the question the next
leaf answers, its expected observation, and what result would falsify the leading hypothesis.
