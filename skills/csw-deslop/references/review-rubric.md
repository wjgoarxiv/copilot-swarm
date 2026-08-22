# Review rubric

## Review packet

The reviewer receives bound scope, baseline, behavior-lock evidence, changed files, diff, focused
and regression commands, real scenario, and known exclusions. Worker or author summaries are not a
substitute for reading the diff.

## Finding format

Each finding includes:

- severity and category;
- path and symbol;
- concrete observed smell;
- cost or failure mode;
- behavior or safeguard to preserve;
- smallest recommended change;
- verification command;
- risk if changed.

## Necessity lane

- Did removed code lack a current caller or owned contract?
- Did added abstraction have at least one real purpose?
- Were speculative variants and duplicate wrappers removed?
- Was healthy code left alone?

## Behavior lane

- Does every cleanup group have focused test evidence?
- Were error, ordering, idempotence, and public contracts preserved?
- Would reverting the cleanup affect only structure/readability rather than intended behavior?
- Was any bug fix hidden inside the cleanup?

## Safety lane

- Did trust-boundary validation remain?
- Are secrets still redacted?
- Are resource, cancellation, and partial-init cleanup intact?
- Did broad fallback or retry behavior become less observable?
- Were permission and authorization checks preserved?

## Architecture lane

- Is ownership clearer?
- Were generic buckets or one-call helpers reduced without creating new ones?
- Does dependency direction remain correct?
- Are module splits based on concepts rather than line count?
- Did compatibility code receive evidence before removal?

## Test lane

- Do tests assert observable behavior?
- Were over-mocked tests replaced with truthful seams?
- Are sleeps, unstable snapshots, and implementation call assertions absent?
- Do boundary and failure cases remain covered?

## Diff lane

- Is every changed line inside scope?
- Is formatting churn isolated or absent?
- Are generated and vendor files untouched unless regenerated?
- Were rationale comments or tool directives deleted accidentally?
- Are unused imports, dead branches, and stale docs gone?

## Real-surface lane

Rerun the actual CLI, HTTP, UI, TUI, hook, package, or file workflow. Record exact command or
interaction, exit/status, observed output, artifact path, and cleanup. A focused test alone cannot
pass this lane.

## Verdict

- **APPROVE:** all lanes pass, no unresolved finding.
- **REJECT:** any behavior, safety, scope, or evidence gap remains.
- **INCONCLUSIVE:** required environment or evidence is unavailable; never convert to approval.

## Final checklist

- [ ] Scope preserved.
- [ ] Behavior lock passes.
- [ ] Focused and regression tests pass.
- [ ] Static checks and build pass.
- [ ] Final diff inspected.
- [ ] Real user scenario passes.
- [ ] Cleanup receipt exists.
- [ ] Remaining risk stated.

## Review summary template

```text
Scope reviewed:
Behavior preserved:
Smells removed:
Safeguards retained:
Focused test:
Regression test:
Real scenario:
Final diff verdict:
Cleanup:
Remaining risk:
```
