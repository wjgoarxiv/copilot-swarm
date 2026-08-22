# Review verdict template

Use one consolidated report after all applicable lanes finish and the conductor has
replayed material evidence.

## Verdict rules

- `UNCONDITIONAL APPROVAL`: every lane clean, all required proof current, no hedge,
  no blocker, and scope/cleanup verified.
- `REJECTION`: any blocker, unresolved material finding, stale/missing proof,
  conditional approval, scope drift, security uncertainty, or cleanup failure.

There is no “approve with comments” state for completion. Non-blocking notes may be
recorded only alongside otherwise unconditional approval and must not hide a required
correction.

## Consolidated report

```markdown
# Review verdict: UNCONDITIONAL APPROVAL | REJECTION

## Review identity
- Goal and approved plan revision:
- Commit/worktree/diff identity:
- Criteria revision set:
- Reviewer lanes and conductor:

## Lane summary
| Lane | Scope | Commands/artifacts replayed | Findings | Verdict |
| --- | --- | --- | --- | --- |
| compliance |  |  |  |  |
| code quality |  |  |  |  |
| manual QA |  |  |  |  |
| evidence integrity |  |  |  |  |
| security/authority |  |  |  |  |
| scope/integration |  |  |  |  |

## Blocking findings
### R001 — BLOCKER|MAJOR|MINOR — title
- Lane and criterion:
- Path/evidence:
- Observed:
- Expected:
- Impact:
- Required correction:
- Required re-verification:

## Evidence replay
- Focused and full commands:
- Package/install/release checks:
- Real-surface artifacts opened:
- Receipt freshness result:
- Same-user trust limitation acknowledged:

## Scope and security
- Must-have coverage:
- Must-NOT result:
- Authority result:
- Untrusted-input/command result:
- Compatibility/migration result:

## Cleanup
- Processes/ports/sessions/contexts/containers:
- Temporary files and diagnostic edits:
- Evidence retained intentionally:

## Final decision
- Verdict:
- Open blocker IDs:
- Exact next action:
```

## Severity

### BLOCKER

- unauthorized external or destructive action;
- secret or sensitive data exposure;
- primary user outcome unimplemented or unusable;
- completion evidence fabricated, missing, or fundamentally invalid;
- unsafe command provenance or uncontrolled process residue;
- rollback impossible where safety depends on it.

### MAJOR

- important edge, regression, compatibility, migration, security, or real-surface
  scenario fails;
- stale receipt after material source change;
- scope drift with public or operational effect;
- tests pass but the promised channel does not;
- isolated-worktree or read-only enforcement requirement was violated.

### MINOR

- local maintainability, precision, documentation, or evidence-index defect with a
  narrow correction;
- non-material inconsistency that still violates an explicit acceptance item.

### NOTE

- verified preservation point;
- accepted limitation already outside scope;
- optional improvement that is clearly not part of completion.

## Worker lane response

Require each worker to return:

```text
Lane:
Inputs actually inspected:
Commands or artifacts actually replayed:
Findings with IDs and severity:
Unverified claims:
Verdict: APPROVE | REJECTION
```

A worker that cannot inspect required inputs returns rejection, not a guessed
approval.

## Conductor synthesis checklist

- [ ] actual diff and untracked paths re-read;
- [ ] worker path and evidence citations opened;
- [ ] material commands rerun from owned sources;
- [ ] real-surface artifacts inspected;
- [ ] current receipt revisions and freshness checked;
- [ ] same-user receipt limitation not overclaimed;
- [ ] security, authority, and must-NOT boundaries checked;
- [ ] cleanup independently confirmed;
- [ ] hedged language converted to a finding;
- [ ] every finding either fixed and re-reviewed or remains blocking.

## Re-review packet

After remediation, record:

```text
Findings addressed:
Changed paths since rejection:
Focused proof replayed:
Full/integration proof replayed:
Real surfaces recaptured:
Receipts refreshed:
Cleanup refreshed:
Lanes rerun:
Remaining findings:
New verdict:
```

Do not reuse the previous approval for a lane whose inputs changed materially.

## Runtime handoff

After `UNCONDITIONAL APPROVAL`, the conductor still checks current machine receipts
and zero blockers, then uses the exact runtime invocation injected at session start with
`complete`. If the oracle rejects, the
overall delivery remains incomplete and the rejection reasons become new findings.
