# Independent visual reviewer packets

Use this reference when the capture matrix is important enough to warrant two
independent reviews. The conductor owns scope, evidence integrity, and the final
verdict. Workers provide bounded read-only analyses; their reports are claims to
be checked against the actual captures.

## Why use two reviewers

Visual review is vulnerable to anchoring. One reviewer may concentrate on fidelity
while missing task completion; another may notice accessibility and state defects
while tolerating drift from the reference. Two packets with different mandates
increase coverage without asking both workers the same vague question.

Use two reviewers when any of these apply:

- the change affects a primary workflow or high-traffic surface;
- an authoritative design or accepted baseline must be matched;
- responsive, zoom, localization, or terminal-width risks are material;
- motion, loading, focus, or multiple product states changed;
- the conductor authored the implementation and needs an independent challenge;
- a prior visual regression escaped a single-review process.

A second opinion does not replace missing scenarios or fresh captures.

## Host controls first

Before launching a worker, configure the Copilot CLI host so the assigned task has
only the tools needed to read files and inspect provided evidence. Prose saying
“read only” is not a security boundary.

- Do not give reviewers write, shell-mutation, browser-interaction, or deployment
  capability when their task is evidence inspection.
- Provide existing captures; do not ask a read-only reviewer to create them.
- Keep credentials, private data, and unrelated artifacts out of the packet.
- Use the native `task` capability to launch each self-contained packet.
- Use `/tasks` to observe status, inspect completion, or cancel work that drifted.
- Do not invent polling functions, foreign team APIs, or background-task handles.

Run the packets independently. Do not send reviewer A's findings to reviewer B
before B finishes; that would reintroduce anchoring.

## Shared evidence manifest

Give both reviewers the same manifest:

```markdown
# Visual evidence manifest

Target revision: <revision>
Build identity: <build-id>
Reference identity: <reference-id-or-none>
Product contract: <short statement>

| Scenario | Geometry | State | Fixture | Target | Reference |
| --- | --- | --- | --- | --- | --- |
| <id> | <viewport-or-terminal> | <state> | <fixture> | <path> | <path-or-n/a> |

Known approved differences:
- <difference and approval source>

Out of scope:
- <surface and reason>
```

Manifest paths must resolve in the reviewer's readable workspace. Each capture
must identify the final build and scenario. If either reviewer reports an unreadable
or ambiguous artifact, fix the manifest and rerun both packets when the correction
could change their conclusions.

## Packet A: product and interaction integrity

This reviewer asks whether the surface enables the intended user task across the
required states and constraints.

Copy and fill this packet before passing it to native `task`:

```markdown
Goal:
Perform a read-only product-integrity review of the supplied visual evidence.

Scope:
- Inspect only the manifest and listed captures.
- Cover every listed scenario.
- Evaluate hierarchy, task clarity, responsive behavior, keyboard-visible state,
  zoom or large-text behavior, loading/error/empty/success states, long content,
  terminal resize and mixed-width content where present.
- Treat missing evidence as a coverage finding, not as a pass.

Inputs:
- Evidence manifest: <path>
- Product requirements or acceptance criteria: <path-or-inline-summary>
- Visual QA severity definitions: <path>

Constraints:
- Read only. Do not edit files, launch servers, interact with accounts, or create
  replacement captures.
- Do not infer behavior that a static capture cannot demonstrate.
- Do not use Reviewer B's report.

Required output:
1. Coverage table for every scenario.
2. Findings ordered by BLOCKER, MAJOR, MINOR, NOTE.
3. For each finding: scenario, evidence path, observation, expected behavior,
   user impact, and the smallest reproducing condition.
4. Strengths worth preserving.
5. Missing evidence and the exact claim it prevents.
6. Provisional GOOD, NEEDS WORK, or BLOCKED verdict with rationale.

Verification:
- Every claim cites a supplied path and scenario.
- No GOOD verdict if a required scenario is unreviewed.
```

### Questions Packet A must answer

- Is the primary action identifiable without scanning unrelated regions?
- Does content order match task order at wide, narrow, and stressed dimensions?
- Are recovery actions visible in loading, empty, and error states?
- Are important controls reachable and visibly focused in supplied keyboard states?
- Does zoom, large text, or long content hide or overlap important information?
- Does the TUI remain intelligible without color and with CJK or wide characters?
- Does motion evidence show stable intermediate and final states?

Packet A should not score pixel similarity unless that measurement directly
supports a task-impact finding.

## Packet B: reference fidelity and evidence integrity

This reviewer challenges whether the comparison itself is valid and whether the
target faithfully implements the accepted visual contract.

Copy and fill this packet before passing it to a second native `task`:

```markdown
Goal:
Perform a read-only reference-fidelity and evidence-integrity review.

Scope:
- Inspect only the manifest and listed captures.
- Validate like-for-like identity, geometry, fixture, theme, locale, zoom, font,
  terminal dimensions, state, and capture freshness.
- Compare global silhouette, layout geometry, typography, component treatment,
  imagery, focus indicators, terminal-cell alignment, and temporal checkpoints.
- Separate regressions from intentional, environmental, reference-defect, and
  incomparable differences.

Inputs:
- Evidence manifest: <path>
- Authoritative reference or accepted baseline: <paths>
- Objective comparison guide: <path>
- Approved-difference record: <path-or-inline-list>

Constraints:
- Read only. Do not edit artifacts, resize inputs, manufacture overlays, or create
  a more favorable replacement capture.
- Do not accept a similarity score without its metric definition.
- Do not use Reviewer A's report.

Required output:
1. Pair-validity table for every target/reference pair.
2. Material difference table with region, measurement or observation,
   classification, severity, evidence, and confidence limits.
3. Likely environmental noise and how it was distinguished.
4. Suspected stale, flattened, or manipulated evidence.
5. Missing metadata and the comparison claims it prevents.
6. Provisional GOOD, NEEDS WORK, or BLOCKED verdict with rationale.

Verification:
- Every comparison identifies both source paths.
- Every metric states dimensions, tolerance, color/alpha treatment, and exclusions.
- No fidelity verdict is issued for a pair marked NOT LIKE-FOR-LIKE.
```

### Questions Packet B must answer

- Can target and reference identities be reproduced?
- Do viewport, device scale, zoom, data, theme, locale, and state truly match?
- Is the target an implemented surface rather than a displayed reference image?
- Are differences localized to coherent elements or distributed as raster noise?
- Do transparent assets behave on their actual backgrounds?
- Are terminal columns compared in cells with the same font environment?
- Does the motion sample include trigger, intermediate, settled, and interrupted
  states when the contract includes motion?

Packet B should not infer usability from a pixel match.

## Dispatch sequence

The conductor follows this sequence:

1. Freeze the final evidence manifest.
2. Configure read-only host policy for both worker tasks.
3. Launch Packet A and Packet B independently with native `task`.
4. Use `/tasks` to verify both are running and to detect a stalled or mis-scoped
   task; cancel rather than accepting work outside the packet.
5. Wait for both reports before revealing either report to the other reviewer.
6. Open the cited captures and verify representative claims personally.
7. Reproduce every blocker and major finding against the final build.
8. Reconcile disagreements using evidence, not reviewer confidence or verbosity.
9. Update captures only by rerunning the authorized capture workflow.
10. If evidence changes materially, rerun affected independent review.

Do not count task completion notifications as proof that the review was correct.

## Reconciliation matrix

| Reviewer A | Reviewer B | Conductor action |
| --- | --- | --- |
| issue | issue | reproduce and classify severity |
| issue | no issue | determine whether it is functional rather than visual |
| no issue | issue | inspect fidelity and comparison validity |
| blocked | any | obtain missing product-state evidence before verdict |
| any | not like-for-like | repair comparison conditions before fidelity verdict |
| good | good | still inspect captures and coverage directly |

When severities differ, use the documented user impact. Do not average severities.

## Conductor verification record

```markdown
### Finding <id>

- Reviewer source: A / B / both
- Scenario: <id>
- Evidence opened: <paths>
- Reproduction performed: <steps-or-not-applicable>
- Actual observation: <fact>
- Contract or expected behavior: <fact>
- Classification: regression / intentional / environment / reference defect /
  incomparable / unresolved
- Severity: BLOCKER / MAJOR / MINOR / NOTE
- Conductor decision: accepted / rejected / needs new evidence
- Reason: <evidence-bound explanation>
```

For rejected worker claims, retain a short reason. Silent omission makes the final
review impossible to audit.

## Evidence sufficiency rules

A capture supports only what it contains.

- A static image supports visible settled-state observations.
- A frame sequence may support motion and layout-shift observations when timing
  and trigger are recorded.
- A keyboard-focused capture supports visible-focus state, not the entire tab order.
- A narrow capture supports that exact width, not all responsive breakpoints.
- A terminal bitmap supports the recorded emulator, font, rows, and columns.
- A diff image supports difference localization only when both originals remain.
- A worker report supports discovery and prioritization, never proof by itself.

Request the smallest additional artifact that closes the missing claim.

## Severity alignment

- `BLOCKER`: primary workflow impossible, critical content inaccessible, crash,
  or evidence suggests the reviewed surface is not the implementation.
- `MAJOR`: required viewport, state, keyboard path, mixed-width rendering, or
  motion behavior materially fails.
- `MINOR`: reproducible local inconsistency with limited user impact.
- `NOTE`: approved difference, environmental condition, or non-blocking idea.

A missing required scenario usually makes the overall verdict `BLOCKED`; it is not
automatically a product blocker.

## Stop conditions

Stop dispatch or reconciliation when:

- the manifest points to stale, mutable, missing, or unauthorized artifacts;
- read-only policy cannot be enforced for an investigation worker;
- the packet contains secrets or unrelated private user data;
- the required product or reference identity cannot be established;
- a worker requests mutation or external access beyond the packet;
- both reviewers are unknowingly examining the same derived or manipulated image;
- the conductor cannot open or reproduce a blocker or major claim.

Return `BLOCKED` with the missing prerequisite. Do not ask workers to improvise.

## Final synthesis template

```markdown
# Independent visual review synthesis

Verdict: GOOD / NEEDS WORK / BLOCKED
Target identity: <revision-and-build>
Matrix reviewed: <scenario IDs>

## Accepted must-fix findings
- <severity> <scenario>: <observation> — <evidence>

## Rejected or reclassified worker findings
- <finding>: <decision and evidence>

## Strengths to preserve
- <specific strength and scenario>

## Missing evidence or residual risk
- <claim not proved and required artifact>

## Reviewer provenance
- Packet A task: <native task identity or report path>
- Packet B task: <native task identity or report path>

## Conductor checks
- captures opened: <paths>
- major findings reproduced: <result>
- cleanup: <result>
```

The conductor issues the verdict only after inspecting the evidence, not merely
after both reviewers agree.
