# Visual QA verdict template

Use this template after inspecting every required matrix row. Do not issue `GOOD`
from test output, source inspection, or a worker summary without fresh visual
evidence.

## Verdict meanings

- `GOOD`: all required scenarios were inspected on the final build; no blocker,
  major, or unaccepted material regression remains.
- `NEEDS WORK`: at least one reproducible must-fix visual, interaction,
  accessibility, responsive, motion, or terminal issue remains.
- `BLOCKED`: required surface, fixture, reference, environment, or capture capability
  is unavailable, so the completion claim cannot be evaluated.

Minor issues may coexist with `GOOD` only when they are explicitly accepted within
the task's completion bar. Do not silently downgrade severity to obtain a passing
verdict.

## Report template

```markdown
# Visual QA verdict: GOOD | NEEDS WORK | BLOCKED

## Scope
- Build identity:
- Changed surfaces:
- Primary user task:
- Authoritative reference:
- Reviewer and capture environment:

## Matrix coverage
| ID | Surface/state | Dimensions | Theme/locale | Evidence | Result |
| --- | --- | --- | --- | --- | --- |

## Must-fix findings
### [BLOCKER|MAJOR|MINOR] Short actionable title
- Scenario:
- Evidence path:
- Observed:
- Expected:
- User impact:
- Reproduction:
- Correction boundary:

## Strengths to preserve
- Specific quality tied to a scenario and evidence path.

## Reference differences
- Difference, classification, and rationale.

## Unreviewed risks
- Scenario and why it could not be reviewed.

## Cleanup
- Servers/sessions/recorders stopped:
- Disposable captures removed:
- Final evidence paths verified:
```

## Severity rubric

### BLOCKER

- primary task cannot be completed;
- keyboard or terminal input becomes trapped;
- required content or control is unreachable;
- the surface crashes, corrupts state, or leaves the terminal unusable;
- a security- or privacy-relevant value is visibly exposed.

### MAJOR

- supported viewport or terminal size breaks the primary path;
- loading, empty state, error, or recovery is missing or unusable;
- keyboard focus order or restoration blocks an important path;
- long content hides an essential value or action;
- wide character/CJK rendering breaks columns or selection;
- motion or async update causes material layout instability;
- reference fidelity is materially wrong in hierarchy or structure.

### MINOR

- local alignment, spacing, typography, icon, border, or rendering defect;
- inconsistent shared-component variant without task failure;
- small reference mismatch with limited user impact;
- polish issue whose correction is narrow and well understood.

### NOTE

- intentional difference from a reference;
- environment-specific rendering variance;
- strength worth preserving;
- optional future improvement outside the completion bar.

## Finding quality checklist

Every must-fix issue must be:

- reproducible from listed steps;
- attached to a matrix scenario;
- supported by a fresh evidence path;
- described as observed versus expected behavior;
- assigned severity from user impact;
- bounded enough that an implementer knows what to inspect;
- independent of vague preference language.

Bad: “The mobile page looks off.”

Good: “At 390 x 844 in the error state, the retry button is below an unscrollable
dialog; keyboard and touch users cannot recover. Evidence: …”

## Reference-difference classifications

Classify every material reference difference as one of:

- `DEFECT`: implementation fails the authoritative reference or product contract;
- `SYSTEM ADAPTATION`: shared design-system behavior intentionally replaces a
  one-off reference detail;
- `ENVIRONMENT VARIANCE`: font rendering, scale, or platform changes pixels without
  changing the contract;
- `INCOMPARABLE`: state, dimensions, content, or version differ too much for a
  fidelity conclusion;
- `APPROVED CHANGE`: user or repository decision explicitly changes the reference.

Pixel difference alone does not choose the classification.

## Coverage gate

Before `GOOD`, verify:

1. final build identity is recorded;
2. all changed surfaces appear in the matrix;
3. required wide and narrow scenarios were captured;
4. keyboard focus was visually inspected where relevant;
5. loading, empty, error, and long content were exercised where supported;
6. motion was reviewed as a sequence when changed;
7. terminal resize, color-off, scrolling, and wide character/CJK were reviewed when
   a TUI changed;
8. evidence paths exist and are attributable to scenarios;
9. temporary servers, sessions, and captures were cleaned up;
10. unreviewed risks are empty or explicitly accepted without weakening the agreed
    completion bar.

If a required item is missing, use `NEEDS WORK` when the surface can be tested but
has not passed, or `BLOCKED` when the required test cannot be performed.

## Concise handoff form

When the full report already exists, hand off with:

```text
Verdict:
Build:
Required scenarios passed / total:
Must-fix issue count by severity:
Evidence index:
Highest-risk unreviewed scenario:
Cleanup state:
Next action:
```

The handoff links to evidence; it does not replace it.
